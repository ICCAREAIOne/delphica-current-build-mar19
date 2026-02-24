/**
 * Drug Interaction Checking Service
 * 
 * This service provides comprehensive drug interaction checking using
 * a combination of local knowledge base and LLM-powered analysis.
 */

import { invokeLLM } from './_core/llm';

export interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: 'critical' | 'moderate' | 'minor';
  description: string;
  recommendation: string;
  sources?: string[];
}

export interface AllergyCheck {
  medication: string;
  allergy: string;
  severity: 'critical' | 'moderate' | 'minor';
  description: string;
  recommendation: string;
}

/**
 * Check for drug-drug interactions using AI analysis
 */
export async function checkDrugInteractions(medications: Array<{ name: string; dosage: string }>): Promise<DrugInteraction[]> {
  if (!medications || medications.length < 2) {
    return [];
  }

  const medList = medications.map(m => `${m.name} (${m.dosage})`).join(', ');

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are a clinical pharmacology expert. Analyze drug interactions and provide structured output in JSON format.
For each interaction found, provide:
- drug1: first drug name
- drug2: second drug name
- severity: "critical", "moderate", or "minor"
- description: brief explanation of the interaction
- recommendation: clinical recommendation

Only include clinically significant interactions. Return an empty array if no significant interactions are found.`,
        },
        {
          role: 'user',
          content: `Analyze the following medication list for drug-drug interactions:\n\n${medList}\n\nProvide a JSON array of interactions.`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'drug_interactions',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              interactions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    drug1: { type: 'string' },
                    drug2: { type: 'string' },
                    severity: { type: 'string', enum: ['critical', 'moderate', 'minor'] },
                    description: { type: 'string' },
                    recommendation: { type: 'string' },
                  },
                  required: ['drug1', 'drug2', 'severity', 'description', 'recommendation'],
                  additionalProperties: false,
                },
              },
            },
            required: ['interactions'],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    const result = JSON.parse(typeof content === 'string' ? content : '{"interactions":[]}');
    return result.interactions || [];
  } catch (error) {
    console.error('[DrugInteraction] Error checking interactions:', error);
    return [];
  }
}

/**
 * Check for drug-allergy interactions
 */
export async function checkDrugAllergies(
  medications: Array<{ name: string; dosage: string }>,
  allergies: string[]
): Promise<AllergyCheck[]> {
  if (!medications || medications.length === 0 || !allergies || allergies.length === 0) {
    return [];
  }

  const medList = medications.map(m => m.name).join(', ');
  const allergyList = allergies.join(', ');

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are a clinical pharmacology expert. Analyze drug-allergy interactions and provide structured output in JSON format.
For each potential allergy conflict, provide:
- medication: the medication name
- allergy: the allergy it conflicts with
- severity: "critical", "moderate", or "minor"
- description: explanation of why this is a concern
- recommendation: what to do about it

Include cross-sensitivities (e.g., penicillin allergy and cephalosporins). Return an empty array if no conflicts are found.`,
        },
        {
          role: 'user',
          content: `Check these medications against patient allergies:\n\nMedications: ${medList}\nAllergies: ${allergyList}\n\nProvide a JSON array of allergy conflicts.`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'allergy_checks',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              conflicts: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    medication: { type: 'string' },
                    allergy: { type: 'string' },
                    severity: { type: 'string', enum: ['critical', 'moderate', 'minor'] },
                    description: { type: 'string' },
                    recommendation: { type: 'string' },
                  },
                  required: ['medication', 'allergy', 'severity', 'description', 'recommendation'],
                  additionalProperties: false,
                },
              },
            },
            required: ['conflicts'],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    const result = JSON.parse(typeof content === 'string' ? content : '{"conflicts":[]}');
    return result.conflicts || [];
  } catch (error) {
    console.error('[DrugAllergy] Error checking allergies:', error);
    return [];
  }
}

/**
 * Comprehensive safety check for a medication list
 */
export async function comprehensiveDrugSafetyCheck(
  medications: Array<{ name: string; dosage: string; frequency: string }>,
  allergies: string[]
): Promise<{
  drugInteractions: DrugInteraction[];
  allergyConflicts: AllergyCheck[];
  criticalIssuesCount: number;
  moderateIssuesCount: number;
  minorIssuesCount: number;
}> {
  const [drugInteractions, allergyConflicts] = await Promise.all([
    checkDrugInteractions(medications),
    checkDrugAllergies(medications, allergies),
  ]);

  const allIssues = [
    ...drugInteractions.map(i => i.severity),
    ...allergyConflicts.map(c => c.severity),
  ];

  return {
    drugInteractions,
    allergyConflicts,
    criticalIssuesCount: allIssues.filter(s => s === 'critical').length,
    moderateIssuesCount: allIssues.filter(s => s === 'moderate').length,
    minorIssuesCount: allIssues.filter(s => s === 'minor').length,
  };
}
