import { invokeLLM } from '../server/_core/llm';

async function generateHypertensionTemplate() {
  const prompt = `You are a clinical expert creating an evidence-based protocol template for Essential Hypertension management in primary care.

Generate a comprehensive, clinically accurate protocol template with the following structure. Return ONLY valid JSON, no markdown formatting:

{
  "name": "Essential Hypertension Management Protocol",
  "description": "Evidence-based protocol for managing essential hypertension in adults",
  "category": "Cardiovascular",
  "tags": ["hypertension", "blood pressure", "cardiovascular", "lifestyle modification"],
  "templateData": {
    "diagnosis": "Essential Hypertension (ICD-10: I10)",
    "duration": "12 weeks initial phase, then ongoing",
    "goals": [
      "Reduce systolic BP to <130 mmHg",
      "Reduce diastolic BP to <80 mmHg",
      "Prevent cardiovascular complications",
      "Improve lifestyle factors contributing to hypertension"
    ],
    "interventions": [
      {
        "category": "Lifestyle Modifications",
        "items": [
          "DASH diet (Dietary Approaches to Stop Hypertension)",
          "Reduce sodium intake to <2g/day (5g salt)",
          "Regular aerobic exercise 30 minutes/day, 5 days/week",
          "Limit alcohol consumption (≤2 drinks/day for men, ≤1 for women)",
          "Weight reduction if BMI >25 (target 5-10% weight loss)",
          "Stress management techniques (meditation, yoga, deep breathing)"
        ]
      },
      {
        "category": "Monitoring",
        "items": [
          "Home blood pressure monitoring twice daily (morning and evening)",
          "Keep BP log with date, time, and readings",
          "Weekly weight measurements",
          "Track medication adherence"
        ]
      },
      {
        "category": "Patient Education",
        "items": [
          "Understanding blood pressure readings and targets",
          "Recognizing hypertensive emergency symptoms",
          "Importance of medication adherence",
          "Dietary sodium sources and label reading",
          "Exercise safety and progression"
        ]
      }
    ],
    "medications": [
      {
        "name": "Lisinopril (ACE Inhibitor)",
        "dosage": "10mg",
        "frequency": "Once daily",
        "instructions": "Take in the morning with or without food. May cause dry cough."
      },
      {
        "name": "Amlodipine (Calcium Channel Blocker)",
        "dosage": "5mg",
        "frequency": "Once daily",
        "instructions": "Alternative first-line agent. Take in the morning. May cause ankle swelling."
      },
      {
        "name": "Hydrochlorothiazide (Thiazide Diuretic)",
        "dosage": "12.5-25mg",
        "frequency": "Once daily",
        "instructions": "Take in the morning to avoid nighttime urination. Monitor potassium levels."
      }
    ],
    "lifestyle": [
      "Monitor BP at home twice daily (morning and evening)",
      "Keep detailed BP log",
      "Reduce dietary sodium to <2g/day",
      "Engage in 150 minutes moderate aerobic exercise weekly",
      "Maintain healthy weight (BMI 18.5-24.9)",
      "Limit alcohol consumption",
      "Quit smoking if applicable",
      "Manage stress through relaxation techniques"
    ],
    "followUp": {
      "frequency": "Every 2-4 weeks until BP controlled, then every 3-6 months",
      "metrics": [
        "Blood pressure readings (target <130/80 mmHg)",
        "Medication adherence and side effects",
        "Lifestyle modification compliance",
        "Weight and BMI",
        "Basic metabolic panel (electrolytes, creatinine) if on diuretics",
        "Lipid panel annually",
        "Cardiovascular risk assessment"
      ]
    },
    "warnings": [
      "Monitor for hypotension (dizziness, lightheadedness, falls)",
      "Watch for ACE inhibitor side effects (dry cough, angioedema)",
      "Check for ankle edema with calcium channel blockers",
      "Monitor electrolytes with diuretic therapy",
      "Avoid NSAIDs which can worsen BP control",
      "Seek emergency care for hypertensive crisis (BP >180/120 with symptoms)",
      "Pregnancy: discontinue ACE inhibitors/ARBs immediately"
    ]
  }
}

Ensure all medications, dosages, and recommendations follow current clinical guidelines (ACC/AHA 2017 Hypertension Guidelines). Return valid JSON only.`;

  const response = await invokeLLM({
    messages: [
      {
        role: 'system',
        content: 'You are a clinical expert generating evidence-based medical protocol templates. Return only valid JSON without markdown formatting.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'hypertension_protocol',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            templateData: {
              type: 'object',
              properties: {
                diagnosis: { type: 'string' },
                duration: { type: 'string' },
                goals: { type: 'array', items: { type: 'string' } },
                interventions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      category: { type: 'string' },
                      items: { type: 'array', items: { type: 'string' } },
                    },
                    required: ['category', 'items'],
                    additionalProperties: false,
                  },
                },
                medications: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      dosage: { type: 'string' },
                      frequency: { type: 'string' },
                      instructions: { type: 'string' },
                    },
                    required: ['name', 'dosage', 'frequency', 'instructions'],
                    additionalProperties: false,
                  },
                },
                lifestyle: { type: 'array', items: { type: 'string' } },
                followUp: {
                  type: 'object',
                  properties: {
                    frequency: { type: 'string' },
                    metrics: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['frequency', 'metrics'],
                  additionalProperties: false,
                },
                warnings: { type: 'array', items: { type: 'string' } },
              },
              required: [
                'diagnosis',
                'duration',
                'goals',
                'interventions',
                'medications',
                'lifestyle',
                'followUp',
                'warnings',
              ],
              additionalProperties: false,
            },
          },
          required: ['name', 'description', 'category', 'tags', 'templateData'],
          additionalProperties: false,
        },
      },
    },
  });

  const template = JSON.parse(response.choices[0].message.content);
  console.log(JSON.stringify(template, null, 2));
  return template;
}

generateHypertensionTemplate().catch(console.error);
