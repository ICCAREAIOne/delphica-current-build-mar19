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
  sourceFormat?: string;
  confidence?: number;
}

export type SupportedFileFormat = "pdf" | "image" | "text" | "unknown";

/**
 * Service for parsing lab reports from various formats (PDF, images, text)
 * with AI-powered data extraction
 */
export class LabParsingService {
  
  /**
   * Detect file format from MIME type or extension
   */
  detectFileFormat(mimeType: string, filename?: string): SupportedFileFormat {
    // PDF formats
    if (mimeType === "application/pdf" || filename?.toLowerCase().endsWith(".pdf")) {
      return "pdf";
    }
    
    // Image formats
    if (
      mimeType.startsWith("image/") ||
      /\.(jpg|jpeg|png|gif|bmp|tiff|webp)$/i.test(filename || "")
    ) {
      return "image";
    }
    
    // Text formats
    if (
      mimeType.startsWith("text/") ||
      /\.(txt|csv|tsv)$/i.test(filename || "")
    ) {
      return "text";
    }
    
    return "unknown";
  }

  /**
   * Parse lab report from any supported format
   * Handles PDF, images (including handwritten), and text files
   */
  async parseUnstructuredLabReport(
    fileContent: string | Buffer,
    mimeType: string,
    filename?: string
  ): Promise<ParsedLabReport> {
    const format = this.detectFileFormat(mimeType, filename);
    
    switch (format) {
      case "pdf":
        return this.parsePDFLabReport(fileContent as string);
      
      case "image":
        return this.parseImageLabReport(fileContent, mimeType);
      
      case "text":
        return this.parseTextLabReport(fileContent as string);
      
      default:
        throw new Error(`Unsupported file format: ${mimeType}`);
    }
  }

  /**
   * Parse lab report from PDF text (existing functionality)
   */
  async parsePDFLabReport(pdfText: string): Promise<ParsedLabReport> {
    return this.parseLabReport(pdfText, "PDF");
  }

  /**
   * Parse lab report from image (JPG, PNG, etc.)
   * Supports typed/printed and handwritten lab reports
   */
  async parseImageLabReport(
    imageContent: string | Buffer,
    mimeType: string
  ): Promise<ParsedLabReport> {
    // Convert buffer to base64 if needed
    const base64Image = Buffer.isBuffer(imageContent)
      ? imageContent.toString("base64")
      : imageContent;
    
    // Construct data URL for the image
    const imageUrl = `data:${mimeType};base64,${base64Image}`;
    
    const messages = [
      {
        role: "system" as const,
        content: `You are a medical AI specialized in parsing laboratory reports from images. You can read both typed/printed and handwritten lab reports. Extract all visible test results, values, units, and reference ranges.`
      },
      {
        role: "user" as const,
        content: [
          {
            type: "text" as const,
            text: `Parse this laboratory report image and extract all structured data. This may be a typed/printed report or handwritten. Extract: labName, testDate (ISO format), patientInfo (name, dob, mrn if visible), results (array with testName, value, unit, referenceRange, flag), and summary.`
          },
          {
            type: "image_url" as const,
            image_url: {
              url: imageUrl,
              detail: "high" as const
            }
          }
        ]
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
              summary: { type: "string" },
              confidence: { type: "number" }
            },
            required: ["results"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0].message.content;
    const jsonString = typeof content === 'string' ? content : "{}";
    const parsed = JSON.parse(jsonString);
    
    return {
      ...parsed,
      sourceFormat: "image"
    };
  }

  /**
   * Parse lab report from plain text file
   */
  async parseTextLabReport(textContent: string): Promise<ParsedLabReport> {
    return this.parseLabReport(textContent, "text");
  }

  /**
   * Generic lab report parser (used by PDF and text parsers)
   */
  private async parseLabReport(content: string, sourceFormat: string): Promise<ParsedLabReport> {
    const messages = [
      {
        role: "system" as const,
        content: `You are a medical AI specialized in parsing laboratory reports. Extract all test results, values, units, and reference ranges from the provided lab report text.`
      },
      {
        role: "user" as const,
        content: `Parse this laboratory report and extract structured data:

${content}

Provide a JSON response with: labName (string), testDate (string in ISO format), patientInfo (object with name, dob, mrn), results (array of objects with testName, value, unit, referenceRange, flag), summary (brief overview string), confidence (number 0-1 indicating parsing confidence).`
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
              summary: { type: "string" },
              confidence: { type: "number" }
            },
            required: ["results"],
            additionalProperties: false
          }
        }
      }
    });

    const content_response = response.choices[0].message.content;
    const jsonString = typeof content_response === 'string' ? content_response : "{}";
    const parsed = JSON.parse(jsonString);
    
    return {
      ...parsed,
      sourceFormat
    };
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
