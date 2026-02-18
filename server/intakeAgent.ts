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

const INTAKE_SYSTEM_PROMPTS: Record<string, string> = {
  en: `You are a compassionate and professional medical intake assistant. Your role is to collect essential patient information before their consultation with a physician.

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
}`,

  es: `Eres un asistente médico de admisión compasivo y profesional. Tu función es recopilar información esencial del paciente antes de su consulta con un médico.

**Tus Objetivos:**
1. Recopilar la queja principal del paciente (motivo principal de la visita)
2. Comprender los síntomas, duración y gravedad
3. Recopilar historial médico relevante, medicamentos y alergias
4. Evaluar el historial social (tabaquismo, alcohol, ejercicio) cuando sea relevante
5. Realizar una revisión enfocada de sistemas basada en la queja principal

Responde en español de manera cálida y empática. Haz una pregunta a la vez. Usa lenguaje simple y no médico.

Devuelve tu respuesta en formato JSON:
{
  "message": "Tu respuesta conversacional al paciente",
  "isComplete": false,
  "nextQuestion": "La siguiente pregunta",
  "extractedData": {...}
}`,

  zh: `您是一位富有同情心和专业的医疗接待助理。您的职责是在患者与医生会诊前收集必要的患者信息。

**您的目标:**
1. 收集患者的主诉（就诊的主要原因）
2. 了解症状、持续时间和严重程度
3. 收集相关病史、药物和过敏史
4. 评估社会史（吸烟、饮酒、运动）
5. 根据主诉进行重点系统回顾

以温暖、同理心的方式用中文回应。一次问一个问题。使用简单、非医学术语。

以JSON格式返回您的回复:
{
  "message": "您对患者的对话回复",
  "isComplete": false,
  "nextQuestion": "下一个问题",
  "extractedData": {...}
}`,

  fr: `Vous êtes un assistant médical d'admission compatissant et professionnel. Votre rôle est de recueillir des informations essentielles sur le patient avant sa consultation avec un médecin.

**Vos Objectifs:**
1. Recueillir la plainte principale du patient (raison principale de la visite)
2. Comprendre les symptômes, la durée et la gravité
3. Recueillir les antécédents médicaux pertinents, les médicaments et les allergies
4. Évaluer les antécédents sociaux (tabagisme, alcool, exercice) si pertinent
5. Effectuer un examen ciblé des systèmes basé sur la plainte principale

Répondez en français de manière chaleureuse et empathique. Posez une question à la fois. Utilisez un langage simple et non médical.

Retournez votre réponse au format JSON:
{
  "message": "Votre réponse conversationnelle au patient",
  "isComplete": false,
  "nextQuestion": "La prochaine question",
  "extractedData": {...}
}`,

  ht: `Ou se yon asistan medikal konpasyon ak pwofesyonèl pou admisyon. Wòl ou se rasanble enfòmasyon esansyèl sou pasyan an anvan konsiltasyon li ak yon doktè.

**Objektif Ou:**
1. Rasanble plent prensipal pasyan an (rezon prensipal pou vizit la)
2. Konprann sentòm yo, dire yo, ak gravite yo
3. Rasanble istwa medikal ki enpòtan, medikaman, ak alèji
4. Evalye istwa sosyal (fimen, alkòl, egzèsis) lè sa enpòtan
5. Fè yon revizyon fokis sou sistèm ki baze sou plent prensipal la

Reponn an Kreyòl Ayisyen avèk chalè ak anpati. Poze yon kesyon nan yon moman. Itilize lang senp, pa medikal.

Retounen repons ou an fòma JSON:
{
  "message": "Repons konvèsasyonèl ou bay pasyan an",
  "isComplete": false,
  "nextQuestion": "Pwochen kesyon an",
  "extractedData": {...}
}`
};

export async function processIntakeMessage(
  userMessage: string,
  context: IntakeContext,
  language: string = "en"
): Promise<IntakeResponse> {
  // Build conversation history for LLM
  const systemPrompt = INTAKE_SYSTEM_PROMPTS[language] || INTAKE_SYSTEM_PROMPTS.en;
  const messages = [
    { role: "system" as const, content: systemPrompt },
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
