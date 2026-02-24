import { invokeLLM } from "./_core/llm";

interface LabResult {
  testName: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  flag?: "normal" | "high" | "low" | "critical";
}

interface ParsedLabReport {
  labName?: string;
  testDate?: string;
  patientInfo?: {
    name?: string;
    dob?: string;
    mrn?: string;
  };
  results: LabResult[];
  summary?: string;
}

/**
 * Service for parsing lab reports from PDFs and extracting structured data
 */
export class LabParsingService {
  
  /**
   * Parse lab report from PDF text
   */
  async parseLabReport(pdfText: string): Promise<ParsedLabReport> {
    const messages = [
      {
        role: "system" as const,
        content: `You are a medical AI specialized in parsing laboratory reports. Extract all test results, values, units, and reference ranges from the provided lab report text.`
      },
      {
        role: "user" as const,
        content: `Parse this laboratory report and extract structured data:

${pdfText}

Provide a JSON response with: labName (string), testDate (string in ISO format), patientInfo (object with name, dob, mrn), results (array of objects with testName, value, unit, referenceRange, flag), summary (brief overview string).`
      }
    ];

    const response = await invokeLLM({
      messages,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "lab_report_parse",
          strict: true,
          schema: {
            type: "object",
            properties: {
              labName: { type: "string" },
              testDate: { type: "string" },
              patientInfo: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  dob: { type: "string" },
                  mrn: { type: "string" }
                },
                required: [],
                additionalProperties: false
              },
              results: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    testName: { type: "string" },
                    value: { type: "string" },
                    unit: { type: "string" },
                    referenceRange: { type: "string" },
                    flag: {
                      type: "string",
                      enum: ["normal", "high", "low", "critical"]
                    }
                  },
                  required: ["testName", "value"],
                  additionalProperties: false
                }
              },
              summary: { type: "string" }
            },
            required: ["results"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0].message.content;
    const jsonString = typeof content === 'string' ? content : "{}";
    return JSON.parse(jsonString);
  }

  /**
   * Analyze lab results in context of patient's condition
   */
  async analyzeLabResults(
    labResults: LabResult[],
    patientDiagnosis: string,
    currentMedications: any[]
  ): Promise<{
    clinicalSignificance: string;
    abnormalFindings: string[];
    recommendations: string[];
    urgency: "routine" | "follow_up" | "urgent" | "critical";
  }> {
    const messages = [
      {
        role: "system" as const,
        content: `You are a clinical AI analyzing laboratory results in the context of a patient's medical condition.

Patient Context:
- Diagnosis: ${patientDiagnosis}
- Current Medications: ${currentMedications.map(m => m.name || m.medicationName).join(", ")}

Analyze the lab results and provide clinical insights.`
      },
      {
        role: "user" as const,
        content: `Analyze these lab results:

${JSON.stringify(labResults, null, 2)}

Provide a JSON response with: clinicalSignificance (string explaining what the results mean), abnormalFindings (array of strings highlighting concerning values), recommendations (array of strings for physician consideration), urgency (routine/follow_up/urgent/critical based on findings).`
      }
    ];

    const response = await invokeLLM({
      messages,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "lab_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              clinicalSignificance: { type: "string" },
              abnormalFindings: {
                type: "array",
                items: { type: "string" }
              },
              recommendations: {
                type: "array",
                items: { type: "string" }
              },
              urgency: {
                type: "string",
                enum: ["routine", "follow_up", "urgent", "critical"]
              }
            },
            required: ["clinicalSignificance", "abnormalFindings", "recommendations", "urgency"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0].message.content;
    const jsonString = typeof content === 'string' ? content : "{}";
    return JSON.parse(jsonString);
  }

  /**
   * Compare lab results with previous results
   */
  async compareLabResults(
    currentResults: LabResult[],
    previousResults: LabResult[],
    diagnosis: string
  ): Promise<{
    trends: Array<{
      testName: string;
      trend: "improving" | "stable" | "worsening";
      explanation: string;
    }>;
    overallAssessment: string;
  }> {
    const messages = [
      {
        role: "system" as const,
        content: `You are a clinical AI comparing laboratory results over time for a patient with ${diagnosis}.`
      },
      {
        role: "user" as const,
        content: `Compare these lab results:

Current Results:
${JSON.stringify(currentResults, null, 2)}

Previous Results:
${JSON.stringify(previousResults, null, 2)}

Provide a JSON response with: trends (array of objects with testName, trend (improving/stable/worsening), explanation), overallAssessment (string summarizing the comparison).`
      }
    ];

    const response = await invokeLLM({
      messages,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "lab_comparison",
          strict: true,
          schema: {
            type: "object",
            properties: {
              trends: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    testName: { type: "string" },
                    trend: {
                      type: "string",
                      enum: ["improving", "stable", "worsening"]
                    },
                    explanation: { type: "string" }
                  },
                  required: ["testName", "trend", "explanation"],
                  additionalProperties: false
                }
              },
              overallAssessment: { type: "string" }
            },
            required: ["trends", "overallAssessment"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0].message.content;
    const jsonString = typeof content === 'string' ? content : "{}";
    return JSON.parse(jsonString);
  }

  /**
   * Generate lab request form content
   */
  async generateLabRequestForm(
    patientInfo: any,
    diagnosis: string,
    icd10Codes: string[],
    testsRequested: string[],
    clinicalHistory?: string,
    currentMedications?: any[]
  ): Promise<{
    formattedRequest: string;
    clinicalJustification: string;
  }> {
    const messages = [
      {
        role: "system" as const,
        content: `You are a clinical AI generating a laboratory test request form.`
      },
      {
        role: "user" as const,
        content: `Generate a professional lab request form with the following information:

Patient: ${patientInfo.name}
DOB: ${patientInfo.dateOfBirth}
MRN: ${patientInfo.mrn || "N/A"}

Diagnosis: ${diagnosis}
ICD-10 Codes: ${icd10Codes.join(", ")}

Tests Requested: ${testsRequested.join(", ")}

Clinical History: ${clinicalHistory || "See diagnosis"}
Current Medications: ${currentMedications?.map(m => m.name || m.medicationName).join(", ") || "None"}

Provide a JSON response with: formattedRequest (string with complete formatted lab request), clinicalJustification (string explaining medical necessity for the tests).`
      }
    ];

    const response = await invokeLLM({
      messages,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "lab_request_form",
          strict: true,
          schema: {
            type: "object",
            properties: {
              formattedRequest: { type: "string" },
              clinicalJustification: { type: "string" }
            },
            required: ["formattedRequest", "clinicalJustification"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0].message.content;
    const jsonString = typeof content === 'string' ? content : "{}";
    return JSON.parse(jsonString);
  }
}

export const labParsingService = new LabParsingService();
