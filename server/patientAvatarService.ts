import { invokeLLM } from "./_core/llm";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface CheckInAnalysis {
  overallAssessment: string;
  concerns: string[];
  alertLevel: "none" | "low" | "medium" | "high" | "critical";
  alertReason?: string;
  suggestedActions: string[];
}

/**
 * AI Avatar for patient check-ins
 * Conducts dynamic, context-aware conversations with patients
 */
export class PatientAvatarService {
  
  /**
   * Start a check-in conversation
   */
  async startCheckIn(
    patientName: string,
    carePlan: any,
    previousCheckIns: any[]
  ): Promise<string> {
    const context = this.buildCheckInContext(patientName, carePlan, previousCheckIns);
    
    const messages: Message[] = [
      {
        role: "system",
        content: `You are a compassionate AI health assistant conducting a check-in with ${patientName}. 

Your role:
- Ask about their overall feeling and specific symptoms
- Inquire about medication adherence
- Check on lifestyle recommendations
- Be empathetic and encouraging
- Ask follow-up questions based on their responses
- Keep questions conversational and natural

${context}

Start by greeting the patient warmly and asking how they're feeling today.`
      }
    ];

    const response = await invokeLLM({ messages });
    const content = response.choices[0].message.content;
    return typeof content === 'string' ? content : "Hello! How are you feeling today?";
  }

  /**
   * Continue check-in conversation
   */
  async continueCheckIn(
    conversationHistory: Message[],
    carePlan: any
  ): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(carePlan);
    
    const messages: Message[] = [
      { role: "system", content: systemPrompt },
      ...conversationHistory
    ];

    const response = await invokeLLM({ messages });
    const content = response.choices[0].message.content;
    return typeof content === 'string' ? content : "I understand. Please tell me more.";
  }

  /**
   * Analyze check-in conversation and extract structured data
   */
  async analyzeCheckIn(
    conversationHistory: Message[],
    carePlan: any
  ): Promise<CheckInAnalysis> {
    const messages: Message[] = [
      {
        role: "system",
        content: `You are a clinical AI analyzing a patient check-in conversation.

Care Plan Context:
- Diagnosis: ${carePlan.diagnosis}
- Goals: ${carePlan.goals.join(", ")}
- Monitoring: ${carePlan.monitoring.map((m: any) => m.metric).join(", ")}

Analyze the conversation and provide a structured assessment.`
      },
      ...conversationHistory,
      {
        role: "user",
        content: "Based on this check-in conversation, provide a JSON analysis with: overallAssessment (string), concerns (array of strings), alertLevel (none/low/medium/high/critical), alertReason (string if alert needed), suggestedActions (array of strings for physician)."
      }
    ];

    const response = await invokeLLM({
      messages,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "check_in_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              overallAssessment: { type: "string" },
              concerns: {
                type: "array",
                items: { type: "string" }
              },
              alertLevel: {
                type: "string",
                enum: ["none", "low", "medium", "high", "critical"]
              },
              alertReason: { type: "string" },
              suggestedActions: {
                type: "array",
                items: { type: "string" }
              }
            },
            required: ["overallAssessment", "concerns", "alertLevel", "suggestedActions"],
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
   * Extract structured check-in data from conversation
   */
  async extractCheckInData(
    conversationHistory: Message[],
    carePlan: any
  ): Promise<{
    overallFeeling: number;
    symptoms: Array<{ symptom: string; severity: number; notes?: string }>;
    medicationsTaken: Array<{ medicationName: string; taken: boolean; missedReason?: string }>;
    lifestyleAdherence: Array<{ activity: string; completed: boolean; notes?: string }>;
    metrics: Array<{ metric: string; value: string; unit?: string }>;
  }> {
    const messages: Message[] = [
      {
        role: "system",
        content: `Extract structured data from this patient check-in conversation.

Care Plan Medications: ${JSON.stringify(carePlan.medications || [])}
Care Plan Lifestyle: ${JSON.stringify(carePlan.lifestyle || [])}
Care Plan Monitoring: ${JSON.stringify(carePlan.monitoring || [])}

Extract all relevant information into the specified JSON format.`
      },
      ...conversationHistory,
      {
        role: "user",
        content: "Extract the check-in data as JSON with: overallFeeling (1-10 number), symptoms (array with symptom, severity 1-10, optional notes), medicationsTaken (array with medicationName, taken boolean, optional missedReason), lifestyleAdherence (array with activity, completed boolean, optional notes), metrics (array with metric, value, optional unit)."
      }
    ];

    const response = await invokeLLM({
      messages,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "check_in_data",
          strict: true,
          schema: {
            type: "object",
            properties: {
              overallFeeling: { type: "number" },
              symptoms: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    symptom: { type: "string" },
                    severity: { type: "number" },
                    notes: { type: "string" }
                  },
                  required: ["symptom", "severity"],
                  additionalProperties: false
                }
              },
              medicationsTaken: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    medicationName: { type: "string" },
                    taken: { type: "boolean" },
                    missedReason: { type: "string" }
                  },
                  required: ["medicationName", "taken"],
                  additionalProperties: false
                }
              },
              lifestyleAdherence: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    activity: { type: "string" },
                    completed: { type: "boolean" },
                    notes: { type: "string" }
                  },
                  required: ["activity", "completed"],
                  additionalProperties: false
                }
              },
              metrics: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    metric: { type: "string" },
                    value: { type: "string" },
                    unit: { type: "string" }
                  },
                  required: ["metric", "value"],
                  additionalProperties: false
                }
              }
            },
            required: ["overallFeeling", "symptoms", "medicationsTaken", "lifestyleAdherence", "metrics"],
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
   * Generate conversation summary for context preservation
   */
  async generateSummary(conversationHistory: Message[]): Promise<string> {
    const messages: Message[] = [
      ...conversationHistory,
      {
        role: "user",
        content: "Provide a brief 2-3 sentence summary of this check-in conversation, highlighting key points and any concerns mentioned."
      }
    ];

    const response = await invokeLLM({ messages });
    const content = response.choices[0].message.content;
    return typeof content === 'string' ? content : "Check-in completed.";
  }

  /**
   * Answer patient questions about their care plan
   */
  async answerQuestion(
    question: string,
    carePlan: any,
    patientHistory: any[]
  ): Promise<string> {
    const messages: Message[] = [
      {
        role: "system",
        content: `You are a knowledgeable AI health assistant helping a patient understand their care plan.

Care Plan:
- Diagnosis: ${carePlan.diagnosis}
- Goals: ${carePlan.goals.join(", ")}
- Medications: ${JSON.stringify(carePlan.medications || [])}
- Lifestyle: ${JSON.stringify(carePlan.lifestyle || [])}
- Monitoring: ${JSON.stringify(carePlan.monitoring || [])}

Answer the patient's question clearly and compassionately. If the question is medical advice beyond the care plan, encourage them to contact their physician.`
      },
      {
        role: "user",
        content: question
      }
    ];

    const response = await invokeLLM({ messages });
    const content = response.choices[0].message.content;
    return typeof content === 'string' ? content : "I'm here to help! Could you please rephrase your question?";
  }

  private buildCheckInContext(
    patientName: string,
    carePlan: any,
    previousCheckIns: any[]
  ): string {
    let context = `Care Plan:
- Diagnosis: ${carePlan.diagnosis}
- Goals: ${carePlan.goals.join(", ")}
- Check-in Frequency: ${carePlan.checkInFrequency}`;

    if (carePlan.medications && carePlan.medications.length > 0) {
      context += `\n- Medications: ${carePlan.medications.map((m: any) => m.name).join(", ")}`;
    }

    if (carePlan.lifestyle && carePlan.lifestyle.length > 0) {
      context += `\n- Lifestyle Recommendations: ${carePlan.lifestyle.map((l: any) => l.recommendation).join(", ")}`;
    }

    if (carePlan.monitoring && carePlan.monitoring.length > 0) {
      context += `\n- Monitoring: ${carePlan.monitoring.map((m: any) => m.metric).join(", ")}`;
    }

    if (previousCheckIns.length > 0) {
      const lastCheckIn = previousCheckIns[0];
      context += `\n\nLast Check-in (${new Date(lastCheckIn.checkInDate).toLocaleDateString()}):
- Overall Feeling: ${lastCheckIn.overallFeeling}/10`;
      
      if (lastCheckIn.conversationSummary) {
        context += `\n- Summary: ${lastCheckIn.conversationSummary}`;
      }
    }

    return context;
  }

  private buildSystemPrompt(carePlan: any): string {
    return `You are a compassionate AI health assistant conducting a check-in.

Care Plan Context:
- Diagnosis: ${carePlan.diagnosis}
- Goals: ${carePlan.goals.join(", ")}
- Medications: ${carePlan.medications?.map((m: any) => m.name).join(", ") || "None"}
- Lifestyle: ${carePlan.lifestyle?.map((l: any) => l.recommendation).join(", ") || "None"}
- Monitoring: ${carePlan.monitoring?.map((m: any) => m.metric).join(", ") || "None"}

Guidelines:
- Ask relevant follow-up questions based on patient responses
- Be empathetic and encouraging
- Inquire about specific symptoms, medications, and lifestyle activities
- Keep the conversation natural and supportive
- If patient mentions concerning symptoms, ask for more details
- Conclude when you have gathered sufficient information`;
  }
}

export const patientAvatarService = new PatientAvatarService();
