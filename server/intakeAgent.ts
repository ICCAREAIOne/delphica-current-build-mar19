import { invokeLLM } from "./_core/llm";

export interface IntakeContext {
  collectedData: {
    chiefComplaint?: string;
    symptoms?: string[];
    duration?: string;
    severity?: string;
    medicalHistory?: string[];
    currentMedications?: string[];
    allergies?: string[];
    socialHistory?: {
      smoking?: string;
      alcohol?: string;
      exercise?: string;
    };
    reviewOfSystems?: Record<string, string[]>;
  };
  conversationHistory: Array<{ role: "assistant" | "user"; content: string }>;
}

export interface IntakeResponse {
  message: string;
  isComplete: boolean;
  nextQuestion?: string;
  extractedData?: Partial<IntakeContext["collectedData"]>;
}

const INTAKE_SYSTEM_PROMPT = `You are a compassionate and professional medical intake assistant. Your role is to collect essential patient information before their consultation with a physician.

**Your Goals:**
1. Gather the patient's chief complaint (main reason for visit)
2. Understand symptoms, duration, and severity
3. Collect relevant medical history, medications, and allergies
4. Assess social history (smoking, alcohol, exercise) when relevant
5. Conduct a focused review of systems based on the chief complaint

**Your Approach:**
- Be warm, empathetic, and patient-centered
- Ask one question at a time to avoid overwhelming the patient
- Use simple, non-medical language
- Acknowledge patient concerns and validate their experience
- Follow up on vague responses with clarifying questions
- If a patient seems distressed or reports emergency symptoms (chest pain, difficulty breathing, severe bleeding), advise them to seek immediate medical attention

**Data Collection Structure:**
- Chief Complaint: Main reason for visit
- Symptoms: Specific symptoms experienced
- Duration: How long symptoms have been present
- Severity: Mild, moderate, or severe
- Medical History: Past diagnoses, surgeries, hospitalizations
- Current Medications: All medications, including over-the-counter and supplements
- Allergies: Drug allergies and reactions
- Social History: Smoking, alcohol use, exercise habits
- Review of Systems: Relevant system-specific symptoms

**When to Complete:**
Mark the intake as complete when you have gathered:
1. Chief complaint
2. Key symptoms and their characteristics
3. Duration and severity
4. Relevant medical history
5. Current medications
6. Known allergies

Return your response in this JSON format:
{
  "message": "Your conversational response to the patient",
  "isComplete": false,
  "nextQuestion": "The next question to ask",
  "extractedData": {
    "chiefComplaint": "extracted value or null",
    "symptoms": ["array of symptoms or empty"],
    "duration": "extracted value or null",
    ...
  }
}`;

export async function processIntakeMessage(
  userMessage: string,
  context: IntakeContext
): Promise<IntakeResponse> {
  // Build conversation history for LLM
  const messages = [
    { role: "system" as const, content: INTAKE_SYSTEM_PROMPT },
    { role: "system" as const, content: `Current collected data: ${JSON.stringify(context.collectedData, null, 2)}` },
    ...context.conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    })),
    { role: "user" as const, content: userMessage }
  ];

  // Call LLM to generate response
  const response = await invokeLLM({
    messages,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "intake_response",
        strict: true,
        schema: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "Conversational response to the patient"
            },
            isComplete: {
              type: "boolean",
              description: "Whether intake is complete"
            },
            nextQuestion: {
              type: "string",
              description: "Next question to ask (if not complete)"
            },
            extractedData: {
              type: "object",
              properties: {
                chiefComplaint: { type: ["string", "null"] },
                symptoms: {
                  type: "array",
                  items: { type: "string" }
                },
                duration: { type: ["string", "null"] },
                severity: { type: ["string", "null"] },
                medicalHistory: {
                  type: "array",
                  items: { type: "string" }
                },
                currentMedications: {
                  type: "array",
                  items: { type: "string" }
                },
                allergies: {
                  type: "array",
                  items: { type: "string" }
                },
                socialHistory: {
                  type: "object",
                  properties: {
                    smoking: { type: ["string", "null"] },
                    alcohol: { type: ["string", "null"] },
                    exercise: { type: ["string", "null"] }
                  },
                  additionalProperties: false
                },
                reviewOfSystems: {
                  type: "object",
                  additionalProperties: {
                    type: "array",
                    items: { type: "string" }
                  }
                }
              },
              additionalProperties: false,
              required: []
            }
          },
          required: ["message", "isComplete"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("No response from LLM");
  }

  const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
  return JSON.parse(contentStr) as IntakeResponse;
}

export function getInitialGreeting(): string {
  return "Hello! I'm here to help gather some information before your consultation. This will help your physician provide you with the best possible care. To start, could you please tell me what brings you in today?";
}
