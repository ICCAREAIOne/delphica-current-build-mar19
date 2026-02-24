import { invokeLLM } from '../server/_core/llm';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const conditions = [
  {
    name: 'Essential Hypertension',
    icd10: 'I10',
    category: 'Cardiovascular',
    tags: ['hypertension', 'blood pressure', 'cardiovascular', 'lifestyle modification'],
    guidelines: 'ACC/AHA 2017 Hypertension Guidelines',
  },
  {
    name: 'Type 2 Diabetes Mellitus',
    icd10: 'E11.9',
    category: 'Endocrinology',
    tags: ['diabetes', 'glucose control', 'metabolic', 'lifestyle modification'],
    guidelines: 'ADA 2024 Standards of Care in Diabetes',
  },
  {
    name: 'Hyperlipidemia',
    icd10: 'E78.5',
    category: 'Cardiovascular',
    tags: ['cholesterol', 'lipids', 'cardiovascular risk', 'statin therapy'],
    guidelines: 'ACC/AHA 2018 Cholesterol Guidelines',
  },
  {
    name: 'Gastroesophageal Reflux Disease (GERD)',
    icd10: 'K21.9',
    category: 'Gastroenterology',
    tags: ['GERD', 'acid reflux', 'heartburn', 'PPI therapy'],
    guidelines: 'ACG 2022 GERD Guidelines',
  },
  {
    name: 'Osteoarthritis',
    icd10: 'M19.90',
    category: 'Rheumatology',
    tags: ['osteoarthritis', 'joint pain', 'mobility', 'pain management'],
    guidelines: 'ACR 2019 Osteoarthritis Guidelines',
  },
];

async function generateTemplate(condition: typeof conditions[0]) {
  console.log(`\nGenerating template for ${condition.name}...`);
  
  const prompt = `You are a clinical expert creating an evidence-based protocol template for ${condition.name} management in primary care.

Generate a comprehensive, clinically accurate protocol template following ${condition.guidelines}.

The protocol should include:
- Diagnosis with ICD-10 code (${condition.icd10})
- Treatment duration (initial phase and ongoing)
- 4-6 specific, measurable treatment goals
- 3-4 intervention categories with specific actionable items
- 3-4 first-line medication options with dosages, frequency, and clinical instructions
- 6-8 lifestyle recommendations
- Follow-up schedule with specific metrics to monitor
- 6-8 important clinical warnings and contraindications

Ensure all medications, dosages, and recommendations follow current clinical guidelines (${condition.guidelines}).`;

  const response = await invokeLLM({
    messages: [
      {
        role: 'system',
        content: 'You are a clinical expert generating evidence-based medical protocol templates. Return only valid JSON.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'protocol_template',
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
  console.log(`✓ Generated template for ${condition.name}`);
  return template;
}

async function generateAllTemplates() {
  console.log('Starting AI-powered protocol template generation...\n');
  
  const templates = [];
  
  for (const condition of conditions) {
    try {
      const template = await generateTemplate(condition);
      templates.push(template);
      
      // Save individual template to file
      const filename = condition.name.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, '');
      const filepath = path.join(process.cwd(), 'scripts', `${filename}-template.json`);
      fs.writeFileSync(filepath, JSON.stringify(template, null, 2));
      console.log(`  Saved to: ${filepath}`);
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Error generating template for ${condition.name}:`, error);
    }
  }
  
  // Save all templates to single file
  const allTemplatesPath = path.join(process.cwd(), 'scripts', 'all-templates.json');
  fs.writeFileSync(allTemplatesPath, JSON.stringify(templates, null, 2));
  
  console.log(`\n✓ Successfully generated ${templates.length} protocol templates`);
  console.log(`✓ All templates saved to: ${allTemplatesPath}`);
  
  return templates;
}

generateAllTemplates().catch(console.error);
