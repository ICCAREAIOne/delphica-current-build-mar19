import { invokeLLM } from "./_core/llm";
import { validateDiagnosisCode } from "./db";

/**
 * Semantic Processor - Medical Coding & Terminology Bridge
 * 
 * Converts clinical documentation into standardized coded data for AI analysis.
 * Handles ICD-10, CPT, SNOMED CT, LOINC, and RxNorm coding.
 */

export interface ClinicalNote {
  chiefComplaint: string;
  historyOfPresentIllness?: string;
  physicalExam?: string;
  assessment?: string;
  plan?: string;
  procedures?: string[];
}

export interface ICD10Code {
  code: string;
  description: string;
  confidence: number;
  category: "primary" | "secondary" | "comorbidity";
}

export interface CPTCode {
  code: string;
  description: string;
  confidence: number;
  modifiers?: string[];
  units?: number;
}

export interface SNOMEDConcept {
  conceptId: string;
  term: string;
  semanticTag: string;
  confidence: number;
}

export interface CodingResult {
  icd10Codes: ICD10Code[];
  cptCodes: CPTCode[];
  snomedConcepts: SNOMEDConcept[];
  extractedEntities: {
    symptoms: string[];
    diagnoses: string[];
    procedures: string[];
    medications: string[];
    anatomicalSites: string[];
  };
  codingNotes: string;
  confidenceScore: number;
}

/**
 * Analyzes clinical documentation and generates ICD-10 diagnosis codes
 */
export async function generateICD10Codes(clinicalNote: ClinicalNote): Promise<ICD10Code[]> {
  const prompt = `You are a medical coding specialist. Analyze the following clinical documentation and suggest appropriate ICD-10 diagnosis codes.

Clinical Documentation:
- Chief Complaint: ${clinicalNote.chiefComplaint}
${clinicalNote.historyOfPresentIllness ? `- History of Present Illness: ${clinicalNote.historyOfPresentIllness}` : ''}
${clinicalNote.physicalExam ? `- Physical Exam: ${clinicalNote.physicalExam}` : ''}
${clinicalNote.assessment ? `- Assessment: ${clinicalNote.assessment}` : ''}

Return a JSON array of ICD-10 codes with the following structure:
[
  {
    "code": "ICD-10 code (e.g., E11.9)",
    "description": "Full description of the diagnosis",
    "confidence": 0.0-1.0,
    "category": "primary" | "secondary" | "comorbidity"
  }
]

Focus on:
1. Primary diagnosis (most specific code possible)
2. Secondary diagnoses
3. Relevant comorbidities
4. Use most current ICD-10-CM codes
5. Include confidence scores based on documentation specificity`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are an expert medical coding specialist with deep knowledge of ICD-10-CM coding guidelines." },
      { role: "user", content: prompt }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "icd10_codes",
        strict: true,
        schema: {
          type: "object",
          properties: {
            codes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  code: { type: "string" },
                  description: { type: "string" },
                  confidence: { type: "number" },
                  category: { type: "string", enum: ["primary", "secondary", "comorbidity"] }
                },
                required: ["code", "description", "confidence", "category"],
                additionalProperties: false
              }
            }
          },
          required: ["codes"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0]?.message?.content;
  const contentStr = typeof content === 'string' ? content : '{"codes":[]}';
  const result = JSON.parse(contentStr);
  const rawCodes: ICD10Code[] = result.codes;

  // ── ICD-10 VALIDATION GATE ──────────────────────────────────────────────────
  // Validate each LLM-generated code against the CMS FY2025 tabular.
  // Invalid codes get confidence=0 and a flagged description so the UI
  // surfaces them to the physician rather than passing them downstream.
  const validatedCodes: ICD10Code[] = [];
  for (const c of rawCodes) {
    const validation = await validateDiagnosisCode(c.code).catch(() => null);
    if (!validation) {
      // DB unavailable — pass through with reduced confidence
      validatedCodes.push({ ...c, confidence: Math.min(c.confidence, 0.4) });
      continue;
    }
    if (!validation.valid) {
      validatedCodes.push({
        code: c.code,
        description: `[INVALID — ${validation.reason ?? 'not in ICD-10-CM FY2025'}] ${c.description}`,
        confidence: 0,
        category: c.category,
      });
      console.warn(`[SemanticProcessor] Invalid ICD-10 "${c.code}": ${validation.reason}`);
    } else {
      const icdDesc = (validation.icd.longDesc ?? validation.icd.shortDesc ?? '').toLowerCase();
      const isUnspecified = icdDesc.includes('unspecified') || icdDesc.includes(' nos');
      validatedCodes.push({
        ...c,
        description: validation.icd.shortDesc ?? c.description,
        confidence: isUnspecified
          ? Math.min(c.confidence, 0.7)
          : c.confidence,
      });
    }
  }
  return validatedCodes;
}

/**
 * Analyzes clinical documentation and generates CPT procedure codes
 */
export async function generateCPTCodes(clinicalNote: ClinicalNote): Promise<CPTCode[]> {
  const prompt = `You are a medical coding specialist. Analyze the following clinical documentation and suggest appropriate CPT procedure codes.

Clinical Documentation:
- Chief Complaint: ${clinicalNote.chiefComplaint}
${clinicalNote.procedures && clinicalNote.procedures.length > 0 ? `- Procedures Performed: ${clinicalNote.procedures.join(', ')}` : ''}
${clinicalNote.plan ? `- Treatment Plan: ${clinicalNote.plan}` : ''}

Return a JSON array of CPT codes with the following structure:
[
  {
    "code": "CPT code (e.g., 99213)",
    "description": "Full description of the procedure/service",
    "confidence": 0.0-1.0,
    "modifiers": ["modifier codes if applicable"],
    "units": 1
  }
]

Focus on:
1. E&M codes (Evaluation and Management)
2. Procedure codes
3. Appropriate modifiers
4. Units (typically 1 unless specified)
5. Include confidence scores`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are an expert medical coding specialist with deep knowledge of CPT coding guidelines." },
      { role: "user", content: prompt }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "cpt_codes",
        strict: true,
        schema: {
          type: "object",
          properties: {
            codes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  code: { type: "string" },
                  description: { type: "string" },
                  confidence: { type: "number" },
                  modifiers: { type: "array", items: { type: "string" } },
                  units: { type: "number" }
                },
                required: ["code", "description", "confidence"],
                additionalProperties: false
              }
            }
          },
          required: ["codes"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0]?.message?.content;
  const contentStr = typeof content === 'string' ? content : '{"codes":[]}';
  const result = JSON.parse(contentStr);
  return result.codes;
}

/**
 * Extracts clinical entities and maps to SNOMED CT concepts
 */
export async function extractClinicalEntities(clinicalNote: ClinicalNote): Promise<{
  symptoms: string[];
  diagnoses: string[];
  procedures: string[];
  medications: string[];
  anatomicalSites: string[];
  snomedConcepts: SNOMEDConcept[];
}> {
  const fullText = `
    Chief Complaint: ${clinicalNote.chiefComplaint}
    ${clinicalNote.historyOfPresentIllness || ''}
    ${clinicalNote.physicalExam || ''}
    ${clinicalNote.assessment || ''}
    ${clinicalNote.plan || ''}
  `.trim();

  const prompt = `Extract clinical entities from the following clinical note and map them to SNOMED CT concepts where applicable.

Clinical Note:
${fullText}

Return a JSON object with extracted entities and SNOMED concepts:
{
  "symptoms": ["list of symptoms"],
  "diagnoses": ["list of diagnoses"],
  "procedures": ["list of procedures"],
  "medications": ["list of medications"],
  "anatomicalSites": ["list of body parts/anatomical locations"],
  "snomedConcepts": [
    {
      "conceptId": "SNOMED CT concept ID",
      "term": "Preferred term",
      "semanticTag": "finding|disorder|procedure|body structure|substance",
      "confidence": 0.0-1.0
    }
  ]
}`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are an expert in clinical natural language processing and SNOMED CT terminology." },
      { role: "user", content: prompt }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "clinical_entities",
        strict: true,
        schema: {
          type: "object",
          properties: {
            symptoms: { type: "array", items: { type: "string" } },
            diagnoses: { type: "array", items: { type: "string" } },
            procedures: { type: "array", items: { type: "string" } },
            medications: { type: "array", items: { type: "string" } },
            anatomicalSites: { type: "array", items: { type: "string" } },
            snomedConcepts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  conceptId: { type: "string" },
                  term: { type: "string" },
                  semanticTag: { type: "string" },
                  confidence: { type: "number" }
                },
                required: ["conceptId", "term", "semanticTag", "confidence"],
                additionalProperties: false
              }
            }
          },
          required: ["symptoms", "diagnoses", "procedures", "medications", "anatomicalSites", "snomedConcepts"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0]?.message?.content;
  const contentStr = typeof content === 'string' ? content : '{"symptoms":[],"diagnoses":[],"procedures":[],"medications":[],"anatomicalSites":[],"snomedConcepts":[]}';
  const result = JSON.parse(contentStr);
  return result;
}

/**
 * Complete semantic processing pipeline
 * Converts clinical documentation into fully coded, structured data
 */
export async function processClinicalNote(clinicalNote: ClinicalNote): Promise<CodingResult> {
  // Run all coding processes in parallel for efficiency
  const [icd10Codes, cptCodes, entities] = await Promise.all([
    generateICD10Codes(clinicalNote),
    generateCPTCodes(clinicalNote),
    extractClinicalEntities(clinicalNote)
  ]);

  // Calculate overall confidence score
  const allConfidences = [
    ...icd10Codes.map(c => c.confidence),
    ...cptCodes.map(c => c.confidence),
    ...entities.snomedConcepts.map(c => c.confidence)
  ];
  const confidenceScore = allConfidences.length > 0
    ? allConfidences.reduce((sum, conf) => sum + conf, 0) / allConfidences.length
    : 0;

  // Generate coding notes
  const codingNotes = `
Processed clinical documentation with ${icd10Codes.length} ICD-10 codes, ${cptCodes.length} CPT codes, and ${entities.snomedConcepts.length} SNOMED concepts.
Primary diagnosis: ${icd10Codes.find(c => c.category === 'primary')?.description || 'Not specified'}
Confidence: ${(confidenceScore * 100).toFixed(1)}%
  `.trim();

  return {
    icd10Codes,
    cptCodes,
    snomedConcepts: entities.snomedConcepts,
    extractedEntities: {
      symptoms: entities.symptoms,
      diagnoses: entities.diagnoses,
      procedures: entities.procedures,
      medications: entities.medications,
      anatomicalSites: entities.anatomicalSites
    },
    codingNotes,
    confidenceScore
  };
}
