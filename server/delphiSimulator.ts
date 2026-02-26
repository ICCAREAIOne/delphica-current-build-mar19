/**
 * Delphi Simulator - AI-powered treatment scenario exploration
 * 
 * Enables physicians to simulate patient responses to different treatments
 * before committing to a care plan through conversational role-play.
 */

import { invokeLLM } from "./_core/llm";

export interface PatientContext {
  age: number;
  gender: string;
  comorbidities: string[];
  currentMedications: string[];
  allergies: string[];
  diagnosisCode: string;
  diagnosisName: string;
}

export interface TreatmentScenario {
  treatmentCode: string;
  treatmentDescription: string;
  timeHorizon: number; // Days
  simulationGoal: string;
}

export interface SimulationOutcome {
  outcomeType: string;
  probability: number; // 0-100
  severity: "mild" | "moderate" | "severe" | "critical";
  expectedDay: number;
  duration: number;
  description: string;
  evidenceSource: string;
  confidenceScore: number;
}

/**
 * Generate a virtual patient persona for simulation
 */
export async function generateVirtualPatient(context: PatientContext): Promise<string> {
  const prompt = `You are a medical simulation AI creating a realistic virtual patient persona.

Patient Context:
- Age: ${context.age}
- Gender: ${context.gender}
- Diagnosis: ${context.diagnosisName} (${context.diagnosisCode})
- Comorbidities: ${context.comorbidities.join(", ") || "None"}
- Current Medications: ${context.currentMedications.join(", ") || "None"}
- Allergies: ${context.allergies.join(", ") || "None"}

Generate a detailed patient persona including:
1. Personality traits and communication style
2. Health literacy level
3. Treatment compliance likelihood
4. Concerns and fears about their condition
5. Support system and lifestyle factors
6. Specific symptoms they're experiencing

Be realistic and evidence-based. This persona will be used for treatment scenario exploration.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are a medical education AI specialized in creating realistic patient simulations for physician training." },
      { role: "user", content: prompt }
    ]
  });

  const content = response.choices[0].message.content;
  return typeof content === 'string' ? content : JSON.stringify(content);
}

/**
 * Simulate patient response to a treatment scenario
 */
export async function simulatePatientResponse(
  patientPersona: string,
  scenario: TreatmentScenario,
  physicianMessage: string,
  conversationHistory: Array<{role: string, message: string}>,
  dayInSimulation: number
): Promise<string> {
  const historyContext = conversationHistory
    .map(h => `${h.role}: ${h.message}`)
    .join("\n");

  const prompt = `You are role-playing as a virtual patient in a medical simulation.

PATIENT PERSONA:
${patientPersona}

TREATMENT SCENARIO:
Treatment: ${scenario.treatmentDescription} (${scenario.treatmentCode})
Day ${dayInSimulation} of ${scenario.timeHorizon}-day simulation
Goal: ${scenario.simulationGoal}

CONVERSATION HISTORY:
${historyContext}

PHYSICIAN'S LATEST MESSAGE:
${physicianMessage}

Respond as the patient would, considering:
1. Your personality and communication style from the persona
2. Realistic symptoms and side effects for this treatment at day ${dayInSimulation}
3. Your concerns, questions, and compliance level
4. Medical accuracy - base responses on evidence for this treatment

Be conversational, realistic, and helpful for the physician's learning. If asked about symptoms, describe them specifically. If discussing compliance, be honest about challenges.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are a virtual patient in a medical simulation. Respond realistically based on the patient persona and treatment scenario." },
      { role: "user", content: prompt }
    ]
  });

  const content = response.choices[0].message.content;
  return typeof content === 'string' ? content : JSON.stringify(content);
}

/**
 * Predict outcomes for a treatment scenario
 */
export async function predictScenarioOutcomes(
  context: PatientContext,
  scenario: TreatmentScenario
): Promise<SimulationOutcome[]> {
  const prompt = `You are a medical AI predicting treatment outcomes.

Patient Context:
- Age: ${context.age}, Gender: ${context.gender}
- Diagnosis: ${context.diagnosisName} (${context.diagnosisCode})
- Comorbidities: ${context.comorbidities.join(", ") || "None"}
- Current Medications: ${context.currentMedications.join(", ") || "None"}
- Allergies: ${context.allergies.join(", ") || "None"}

Treatment Scenario:
${scenario.treatmentDescription}
Time Horizon: ${scenario.timeHorizon} days
Goal: ${scenario.simulationGoal}

Predict 5-8 realistic outcomes for this treatment scenario. For each outcome, provide:
1. Outcome type (e.g., "symptom_improvement", "adverse_event", "compliance_issue")
2. Probability (0-100%)
3. Severity (mild/moderate/severe/critical)
4. Expected day when this occurs
5. Duration in days
6. Description
7. Evidence source (cite medical literature or guidelines)
8. Confidence score (0-100%)

Return as JSON array with this structure:
[{
  "outcomeType": "string",
  "probability": number,
  "severity": "mild" | "moderate" | "severe" | "critical",
  "expectedDay": number,
  "duration": number,
  "description": "string",
  "evidenceSource": "string",
  "confidenceScore": number
}]

Base predictions on medical evidence and the specific patient context.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are a medical AI specialized in treatment outcome prediction. Always return valid JSON." },
      { role: "user", content: prompt }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "outcome_predictions",
        strict: true,
        schema: {
          type: "object",
          properties: {
            outcomes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  outcomeType: { type: "string" },
                  probability: { type: "number" },
                  severity: { type: "string", enum: ["mild", "moderate", "severe", "critical"] },
                  expectedDay: { type: "number" },
                  duration: { type: "number" },
                  description: { type: "string" },
                  evidenceSource: { type: "string" },
                  confidenceScore: { type: "number" }
                },
                required: ["outcomeType", "probability", "severity", "expectedDay", "duration", "description", "evidenceSource", "confidenceScore"],
                additionalProperties: false
              }
            }
          },
          required: ["outcomes"],
          additionalProperties: false
        }
      }
    }
  });

  const content = typeof response.choices[0].message.content === 'string' 
    ? response.choices[0].message.content 
    : JSON.stringify(response.choices[0].message.content);
  const parsed = JSON.parse(content || "{}");
  return parsed.outcomes || [];
}

/**
 * Compare multiple scenarios and rank them
 */
export async function compareScenarios(
  context: PatientContext,
  scenarios: Array<{
    id: number;
    treatmentDescription: string;
    outcomes: SimulationOutcome[];
  }>
): Promise<Array<{scenarioId: number, score: number, reasoning: string}>> {
  const scenarioDescriptions = scenarios.map((s, idx) => 
    `Scenario ${idx + 1} (ID: ${s.id}):
Treatment: ${s.treatmentDescription}
Predicted Outcomes:
${s.outcomes.map(o => `- ${o.outcomeType}: ${o.probability}% probability, ${o.severity} severity, ${o.description}`).join("\n")}`
  ).join("\n\n");

  const prompt = `You are a medical AI comparing treatment scenarios.

Patient Context:
- Age: ${context.age}, Gender: ${context.gender}
- Diagnosis: ${context.diagnosisName} (${context.diagnosisCode})
- Comorbidities: ${context.comorbidities.join(", ") || "None"}

SCENARIOS TO COMPARE:
${scenarioDescriptions}

Rank these scenarios from best to worst for this patient. For each scenario, provide:
1. Score (0-100, higher is better)
2. Detailed reasoning explaining the ranking

Consider:
- Efficacy (likelihood of achieving treatment goals)
- Safety (risk of adverse events)
- Patient-specific factors (age, comorbidities, etc.)
- Quality of life impact
- Evidence strength

Return as JSON array:
[{
  "scenarioId": number,
  "score": number,
  "reasoning": "string"
}]

Order from highest to lowest score.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are a medical AI specialized in treatment comparison and decision support. Always return valid JSON." },
      { role: "user", content: prompt }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "scenario_ranking",
        strict: true,
        schema: {
          type: "object",
          properties: {
            rankings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  scenarioId: { type: "number" },
                  score: { type: "number" },
                  reasoning: { type: "string" }
                },
                required: ["scenarioId", "score", "reasoning"],
                additionalProperties: false
              }
            }
          },
          required: ["rankings"],
          additionalProperties: false
        }
      }
    }
  });

  const content = typeof response.choices[0].message.content === 'string' 
    ? response.choices[0].message.content 
    : JSON.stringify(response.choices[0].message.content);
  const parsed = JSON.parse(content || "{}");
  return parsed.rankings || [];
}

/**
 * Generate "what-if" analysis for scenario modifications
 */
export async function analyzeWhatIf(
  context: PatientContext,
  baseScenario: TreatmentScenario,
  modification: string
): Promise<{
  modifiedOutcomes: SimulationOutcome[];
  comparison: string;
  recommendation: string;
}> {
  const prompt = `You are a medical AI performing "what-if" analysis.

Patient Context:
- Age: ${context.age}, Gender: ${context.gender}
- Diagnosis: ${context.diagnosisName} (${context.diagnosisCode})
- Comorbidities: ${context.comorbidities.join(", ") || "None"}

BASE SCENARIO:
${baseScenario.treatmentDescription}

PROPOSED MODIFICATION:
${modification}

Analyze how this modification would change the outcomes. Provide:
1. Modified outcome predictions (same format as predictScenarioOutcomes)
2. Comparison with base scenario
3. Recommendation (should this modification be made?)

Return as JSON:
{
  "modifiedOutcomes": [{outcome objects}],
  "comparison": "string explaining key differences",
  "recommendation": "string with clear recommendation"
}`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are a medical AI specialized in treatment modification analysis. Always return valid JSON." },
      { role: "user", content: prompt }
    ]
  });

  const content = typeof response.choices[0].message.content === 'string' 
    ? response.choices[0].message.content 
    : JSON.stringify(response.choices[0].message.content);
  return JSON.parse(content || "{}");
}
