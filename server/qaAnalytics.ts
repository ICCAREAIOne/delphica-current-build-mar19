import { invokeLLM } from "./_core/llm";
import type { ClinicalNote, CodingResult } from "./semanticProcessor";

/**
 * Quality Assurance Analytics Service
 * 
 * Analyzes coding quality, documentation completeness, and provides
 * actionable suggestions for improvement.
 */

export interface DocumentationQualityAnalysis {
  completenessScore: number; // 0-100
  specificityScore: number; // 0-100
  clarityScore: number; // 0-100
  overallScore: number; // 0-100
  missingElements: string[];
  vagueStatements: string[];
  recommendations: string[];
}

export interface CodingAccuracyAnalysis {
  icd10Accuracy: number; // 0-100
  cptAccuracy: number; // 0-100
  overallAccuracy: number; // 0-100
  potentialErrors: Array<{
    code: string;
    issue: string;
    suggestion: string;
  }>;
  optimizationOpportunities: Array<{
    area: string;
    currentCode: string;
    suggestedCode: string;
    rationale: string;
    reimbursementImpact: string;
  }>;
}

export interface ImprovementSuggestion {
  category: "documentation" | "coding" | "specificity" | "reimbursement";
  priority: "high" | "medium" | "low";
  issue: string;
  recommendation: string;
  potentialImpact: string;
  example?: string;
}

export interface QualityMetrics {
  documentationQuality: DocumentationQualityAnalysis;
  codingAccuracy: CodingAccuracyAnalysis;
  reimbursementOptimizationScore: number; // 0-100
  overallQualityScore: number; // 0-100
  suggestions: ImprovementSuggestion[];
  processingTimeMs: number;
}

/**
 * Analyzes documentation quality and completeness
 */
export async function analyzeDocumentationQuality(
  clinicalNote: ClinicalNote
): Promise<DocumentationQualityAnalysis> {
  const fullText = `
Chief Complaint: ${clinicalNote.chiefComplaint}
${clinicalNote.historyOfPresentIllness ? `HPI: ${clinicalNote.historyOfPresentIllness}` : ''}
${clinicalNote.physicalExam ? `Physical Exam: ${clinicalNote.physicalExam}` : ''}
${clinicalNote.assessment ? `Assessment: ${clinicalNote.assessment}` : ''}
${clinicalNote.plan ? `Plan: ${clinicalNote.plan}` : ''}
  `.trim();

  const prompt = `Analyze the following clinical documentation for quality, completeness, and specificity.

Clinical Documentation:
${fullText}

Evaluate based on these criteria:
1. **Completeness**: Are all essential SOAP note elements present and detailed?
2. **Specificity**: Are symptoms, findings, and diagnoses described with sufficient clinical detail?
3. **Clarity**: Is the documentation clear, organized, and unambiguous?

Return a JSON object with the following structure:
{
  "completenessScore": 0-100,
  "specificityScore": 0-100,
  "clarityScore": 0-100,
  "overallScore": 0-100,
  "missingElements": ["list of missing or incomplete documentation elements"],
  "vagueStatements": ["list of vague or non-specific statements that need more detail"],
  "recommendations": ["specific actionable recommendations to improve documentation quality"]
}

Focus on:
- Missing HPI elements (onset, location, duration, character, aggravating/alleviating factors, radiation, timing)
- Vague symptom descriptions (e.g., "some pain" vs "7/10 sharp pain")
- Incomplete physical exam findings
- Non-specific assessments
- Incomplete treatment plans`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are an expert in clinical documentation quality and medical coding compliance." },
      { role: "user", content: prompt }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "documentation_quality",
        strict: true,
        schema: {
          type: "object",
          properties: {
            completenessScore: { type: "number" },
            specificityScore: { type: "number" },
            clarityScore: { type: "number" },
            overallScore: { type: "number" },
            missingElements: { type: "array", items: { type: "string" } },
            vagueStatements: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } }
          },
          required: ["completenessScore", "specificityScore", "clarityScore", "overallScore", "missingElements", "vagueStatements", "recommendations"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0]?.message?.content;
  const contentStr = typeof content === 'string' ? content : '{"completenessScore":0,"specificityScore":0,"clarityScore":0,"overallScore":0,"missingElements":[],"vagueStatements":[],"recommendations":[]}';
  return JSON.parse(contentStr);
}

/**
 * Analyzes coding accuracy and identifies optimization opportunities
 */
export async function analyzeCodingAccuracy(
  clinicalNote: ClinicalNote,
  codingResult: CodingResult
): Promise<CodingAccuracyAnalysis> {
  const fullText = `
Chief Complaint: ${clinicalNote.chiefComplaint}
${clinicalNote.historyOfPresentIllness ? `HPI: ${clinicalNote.historyOfPresentIllness}` : ''}
${clinicalNote.assessment ? `Assessment: ${clinicalNote.assessment}` : ''}
${clinicalNote.plan ? `Plan: ${clinicalNote.plan}` : ''}
  `.trim();

  const codesText = `
ICD-10 Codes: ${codingResult.icd10Codes.map(c => `${c.code} (${c.description})`).join(', ')}
CPT Codes: ${codingResult.cptCodes.map(c => `${c.code} (${c.description})`).join(', ')}
  `.trim();

  const prompt = `Review the following clinical documentation and assigned codes for accuracy and optimization opportunities.

Clinical Documentation:
${fullText}

Assigned Codes:
${codesText}

Analyze for:
1. **Coding Accuracy**: Are the codes appropriate for the documented clinical scenario?
2. **Specificity**: Could more specific codes be used for better reimbursement?
3. **Completeness**: Are all billable services and diagnoses coded?
4. **Optimization**: Are there higher-value codes that could be justified by the documentation?

Return a JSON object:
{
  "icd10Accuracy": 0-100,
  "cptAccuracy": 0-100,
  "overallAccuracy": 0-100,
  "potentialErrors": [
    {
      "code": "code that may be incorrect",
      "issue": "description of the issue",
      "suggestion": "recommended correction"
    }
  ],
  "optimizationOpportunities": [
    {
      "area": "diagnosis/procedure area",
      "currentCode": "current code",
      "suggestedCode": "more specific/valuable code",
      "rationale": "why the suggested code is better",
      "reimbursementImpact": "estimated impact (e.g., +$50, +15%)"
    }
  ]
}`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are an expert medical coder and reimbursement specialist." },
      { role: "user", content: prompt }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "coding_accuracy",
        strict: true,
        schema: {
          type: "object",
          properties: {
            icd10Accuracy: { type: "number" },
            cptAccuracy: { type: "number" },
            overallAccuracy: { type: "number" },
            potentialErrors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  code: { type: "string" },
                  issue: { type: "string" },
                  suggestion: { type: "string" }
                },
                required: ["code", "issue", "suggestion"],
                additionalProperties: false
              }
            },
            optimizationOpportunities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  area: { type: "string" },
                  currentCode: { type: "string" },
                  suggestedCode: { type: "string" },
                  rationale: { type: "string" },
                  reimbursementImpact: { type: "string" }
                },
                required: ["area", "currentCode", "suggestedCode", "rationale", "reimbursementImpact"],
                additionalProperties: false
              }
            }
          },
          required: ["icd10Accuracy", "cptAccuracy", "overallAccuracy", "potentialErrors", "optimizationOpportunities"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0]?.message?.content;
  const contentStr = typeof content === 'string' ? content : '{"icd10Accuracy":0,"cptAccuracy":0,"overallAccuracy":0,"potentialErrors":[],"optimizationOpportunities":[]}';
  return JSON.parse(contentStr);
}

/**
 * Generates prioritized improvement suggestions
 */
export async function generateImprovementSuggestions(
  documentationQuality: DocumentationQualityAnalysis,
  codingAccuracy: CodingAccuracyAnalysis
): Promise<ImprovementSuggestion[]> {
  const analysisText = `
Documentation Quality:
- Completeness: ${documentationQuality.completenessScore}/100
- Specificity: ${documentationQuality.specificityScore}/100
- Missing Elements: ${documentationQuality.missingElements.join(', ')}
- Vague Statements: ${documentationQuality.vagueStatements.join(', ')}

Coding Accuracy:
- ICD-10 Accuracy: ${codingAccuracy.icd10Accuracy}/100
- CPT Accuracy: ${codingAccuracy.cptAccuracy}/100
- Potential Errors: ${codingAccuracy.potentialErrors.length}
- Optimization Opportunities: ${codingAccuracy.optimizationOpportunities.length}
  `.trim();

  const prompt = `Based on the following quality analysis, generate prioritized improvement suggestions.

Analysis:
${analysisText}

Generate actionable suggestions in these categories:
1. **Documentation**: Improve clinical documentation quality
2. **Coding**: Fix coding errors or improve code selection
3. **Specificity**: Add more specific clinical details
4. **Reimbursement**: Optimize for better reimbursement

Return a JSON array of suggestions:
[
  {
    "category": "documentation" | "coding" | "specificity" | "reimbursement",
    "priority": "high" | "medium" | "low",
    "issue": "description of the issue",
    "recommendation": "specific action to take",
    "potentialImpact": "expected benefit (quality, compliance, revenue)",
    "example": "optional example of good documentation"
  }
]

Prioritize by:
- High: Critical for compliance, significant reimbursement impact, or major quality gaps
- Medium: Important for optimization, moderate impact
- Low: Nice-to-have improvements`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are an expert in clinical documentation improvement and revenue cycle optimization." },
      { role: "user", content: prompt }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "improvement_suggestions",
        strict: true,
        schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string", enum: ["documentation", "coding", "specificity", "reimbursement"] },
                  priority: { type: "string", enum: ["high", "medium", "low"] },
                  issue: { type: "string" },
                  recommendation: { type: "string" },
                  potentialImpact: { type: "string" },
                  example: { type: "string" }
                },
                required: ["category", "priority", "issue", "recommendation", "potentialImpact"],
                additionalProperties: false
              }
            }
          },
          required: ["suggestions"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0]?.message?.content;
  const contentStr = typeof content === 'string' ? content : '{"suggestions":[]}';
  const result = JSON.parse(contentStr);
  return result.suggestions;
}

/**
 * Calculates reimbursement optimization score
 */
export function calculateReimbursementScore(
  codingAccuracy: CodingAccuracyAnalysis,
  documentationQuality: DocumentationQualityAnalysis
): number {
  // Weighted scoring:
  // - 40% coding accuracy (accurate codes = proper reimbursement)
  // - 30% documentation completeness (supports code justification)
  // - 20% specificity (enables higher-value codes)
  // - 10% optimization opportunities utilized
  
  const codingWeight = 0.4;
  const completenessWeight = 0.3;
  const specificityWeight = 0.2;
  const optimizationWeight = 0.1;
  
  const optimizationUtilization = codingAccuracy.optimizationOpportunities.length > 0
    ? Math.max(0, 100 - (codingAccuracy.optimizationOpportunities.length * 10))
    : 100;
  
  const score = 
    (codingAccuracy.overallAccuracy * codingWeight) +
    (documentationQuality.completenessScore * completenessWeight) +
    (documentationQuality.specificityScore * specificityWeight) +
    (optimizationUtilization * optimizationWeight);
  
  return Math.round(score);
}

/**
 * Complete quality metrics analysis pipeline
 */
export async function analyzeQualityMetrics(
  clinicalNote: ClinicalNote,
  codingResult: CodingResult
): Promise<QualityMetrics> {
  const startTime = Date.now();
  
  // Run analyses in parallel for efficiency
  const [documentationQuality, codingAccuracy] = await Promise.all([
    analyzeDocumentationQuality(clinicalNote),
    analyzeCodingAccuracy(clinicalNote, codingResult)
  ]);
  
  // Generate improvement suggestions
  const suggestions = await generateImprovementSuggestions(documentationQuality, codingAccuracy);
  
  // Calculate scores
  const reimbursementOptimizationScore = calculateReimbursementScore(codingAccuracy, documentationQuality);
  const overallQualityScore = Math.round(
    (documentationQuality.overallScore * 0.4) +
    (codingAccuracy.overallAccuracy * 0.4) +
    (reimbursementOptimizationScore * 0.2)
  );
  
  const processingTimeMs = Date.now() - startTime;
  
  return {
    documentationQuality,
    codingAccuracy,
    reimbursementOptimizationScore,
    overallQualityScore,
    suggestions,
    processingTimeMs
  };
}

/**
 * Calculates aggregate physician performance metrics
 */
export interface PhysicianPerformanceMetrics {
  totalEncounters: number;
  avgCodingAccuracy: number;
  avgDocumentationQuality: number;
  avgReimbursementOptimization: number;
  accuracyTrend: "improving" | "stable" | "declining";
  qualityTrend: "improving" | "stable" | "declining";
  commonGaps: Array<{ gap: string; frequency: number; recommendation: string }>;
  strengthAreas: Array<{ area: string; score: number }>;
  improvementAreas: Array<{ area: string; currentScore: number; targetScore: number; actionItems: string[] }>;
}

export function calculatePhysicianPerformance(
  metrics: Array<{
    codingAccuracy: number;
    documentationQuality: number;
    reimbursementScore: number;
    date: Date;
  }>
): PhysicianPerformanceMetrics {
  if (metrics.length === 0) {
    return {
      totalEncounters: 0,
      avgCodingAccuracy: 0,
      avgDocumentationQuality: 0,
      avgReimbursementOptimization: 0,
      accuracyTrend: "stable",
      qualityTrend: "stable",
      commonGaps: [],
      strengthAreas: [],
      improvementAreas: []
    };
  }
  
  // Calculate averages
  const avgCodingAccuracy = Math.round(
    metrics.reduce((sum, m) => sum + m.codingAccuracy, 0) / metrics.length
  );
  const avgDocumentationQuality = Math.round(
    metrics.reduce((sum, m) => sum + m.documentationQuality, 0) / metrics.length
  );
  const avgReimbursementOptimization = Math.round(
    metrics.reduce((sum, m) => sum + m.reimbursementScore, 0) / metrics.length
  );
  
  // Calculate trends (compare first half vs second half)
  const midpoint = Math.floor(metrics.length / 2);
  const firstHalf = metrics.slice(0, midpoint);
  const secondHalf = metrics.slice(midpoint);
  
  const firstHalfAccuracy = firstHalf.reduce((sum, m) => sum + m.codingAccuracy, 0) / firstHalf.length;
  const secondHalfAccuracy = secondHalf.reduce((sum, m) => sum + m.codingAccuracy, 0) / secondHalf.length;
  const accuracyDiff = secondHalfAccuracy - firstHalfAccuracy;
  
  const firstHalfQuality = firstHalf.reduce((sum, m) => sum + m.documentationQuality, 0) / firstHalf.length;
  const secondHalfQuality = secondHalf.reduce((sum, m) => sum + m.documentationQuality, 0) / secondHalf.length;
  const qualityDiff = secondHalfQuality - firstHalfQuality;
  
  const accuracyTrend: "improving" | "stable" | "declining" = 
    accuracyDiff > 5 ? "improving" : accuracyDiff < -5 ? "declining" : "stable";
  const qualityTrend: "improving" | "stable" | "declining" = 
    qualityDiff > 5 ? "improving" : qualityDiff < -5 ? "declining" : "stable";
  
  // Identify strengths and improvement areas
  const strengthAreas = [];
  const improvementAreas = [];
  
  if (avgCodingAccuracy >= 85) {
    strengthAreas.push({ area: "Coding Accuracy", score: avgCodingAccuracy });
  } else {
    improvementAreas.push({
      area: "Coding Accuracy",
      currentScore: avgCodingAccuracy,
      targetScore: 90,
      actionItems: [
        "Review ICD-10 coding guidelines for common diagnoses",
        "Use more specific diagnosis codes when documentation supports it",
        "Attend coding accuracy training session"
      ]
    });
  }
  
  if (avgDocumentationQuality >= 85) {
    strengthAreas.push({ area: "Documentation Quality", score: avgDocumentationQuality });
  } else {
    improvementAreas.push({
      area: "Documentation Quality",
      currentScore: avgDocumentationQuality,
      targetScore: 90,
      actionItems: [
        "Include all HPI elements in clinical notes",
        "Use specific measurements and descriptors",
        "Document medical necessity for all procedures"
      ]
    });
  }
  
  if (avgReimbursementOptimization >= 85) {
    strengthAreas.push({ area: "Reimbursement Optimization", score: avgReimbursementOptimization });
  } else {
    improvementAreas.push({
      area: "Reimbursement Optimization",
      currentScore: avgReimbursementOptimization,
      targetScore: 90,
      actionItems: [
        "Review documentation to support higher-level E&M codes",
        "Ensure all billable services are documented and coded",
        "Use modifiers appropriately to maximize reimbursement"
      ]
    });
  }
  
  return {
    totalEncounters: metrics.length,
    avgCodingAccuracy,
    avgDocumentationQuality,
    avgReimbursementOptimization,
    accuracyTrend,
    qualityTrend,
    commonGaps: [], // Would be populated from actual gap analysis
    strengthAreas,
    improvementAreas
  };
}
