import { describe, it, expect } from 'vitest';
import * as db from './db';

describe('AI-Generated Protocol Templates', () => {
  it('should have seeded protocol templates in database', async () => {
    const templates = await db.getAllProtocolTemplates();
    
    expect(templates).toBeDefined();
    expect(Array.isArray(templates)).toBe(true);
    expect(templates.length).toBeGreaterThanOrEqual(5);
  });

  it('should include hypertension template', async () => {
    const templates = await db.getAllProtocolTemplates();
    const hypertensionTemplate = templates.find(t => 
      t.name.toLowerCase().includes('hypertension')
    );
    
    expect(hypertensionTemplate).toBeDefined();
    expect(['Cardiovascular', 'Cardiology']).toContain(hypertensionTemplate?.category);
    expect(hypertensionTemplate?.isPublic).toBe(true);
  });

  it('should include diabetes template', async () => {
    const templates = await db.getAllProtocolTemplates();
    const diabetesTemplate = templates.find(t => 
      t.name.toLowerCase().includes('diabetes')
    );
    
    expect(diabetesTemplate).toBeDefined();
    expect(diabetesTemplate?.category).toBe('Endocrinology');
    expect(diabetesTemplate?.isPublic).toBe(true);
  });

  it('should include hyperlipidemia template', async () => {
    const templates = await db.getAllProtocolTemplates();
    const hyperlipidemiaTemplate = templates.find(t => 
      t.name.toLowerCase().includes('hyperlipidemia') || 
      t.name.toLowerCase().includes('lipid')
    );
    
    expect(hyperlipidemiaTemplate).toBeDefined();
    expect(hyperlipidemiaTemplate?.category).toBe('Cardiovascular');
    expect(hyperlipidemiaTemplate?.isPublic).toBe(true);
  });

  it('should include GERD template', async () => {
    const templates = await db.getAllProtocolTemplates();
    const gerdTemplate = templates.find(t => 
      t.name.toLowerCase().includes('gerd') || 
      t.name.toLowerCase().includes('reflux')
    );
    
    expect(gerdTemplate).toBeDefined();
    expect(gerdTemplate?.category).toBe('Gastroenterology');
    expect(gerdTemplate?.isPublic).toBe(true);
  });

  it('should include osteoarthritis template', async () => {
    const templates = await db.getAllProtocolTemplates();
    const oaTemplate = templates.find(t => 
      t.name.toLowerCase().includes('osteoarthritis')
    );
    
    expect(oaTemplate).toBeDefined();
    expect(oaTemplate?.category).toBe('Rheumatology');
    expect(oaTemplate?.isPublic).toBe(true);
  });

  it('should have complete template data structure', async () => {
    const templates = await db.getAllProtocolTemplates();
    const template = templates[0];
    
    expect(template).toBeDefined();
    expect(template.templateData).toBeDefined();
    expect(template.templateData.diagnosis).toBeDefined();
    expect(template.templateData.duration).toBeDefined();
    expect(Array.isArray(template.templateData.goals)).toBe(true);
    expect(Array.isArray(template.templateData.interventions)).toBe(true);
    expect(Array.isArray(template.templateData.medications)).toBe(true);
    expect(Array.isArray(template.templateData.lifestyle)).toBe(true);
    expect(template.templateData.followUp).toBeDefined();
    expect(Array.isArray(template.templateData.warnings)).toBe(true);
  });

  it('should have medications with proper structure', async () => {
    const templates = await db.getAllProtocolTemplates();
    const template = templates[0];
    
    const medications = template.templateData.medications;
    expect(medications.length).toBeGreaterThan(0);
    
    const medication = medications[0];
    expect(medication.name).toBeDefined();
    expect(medication.dosage).toBeDefined();
    expect(medication.frequency).toBeDefined();
    expect(medication.instructions).toBeDefined();
  });

  it('should have interventions with categories', async () => {
    const templates = await db.getAllProtocolTemplates();
    const template = templates[0];
    
    const interventions = template.templateData.interventions;
    expect(interventions.length).toBeGreaterThan(0);
    
    const intervention = interventions[0];
    expect(intervention.category).toBeDefined();
    expect(Array.isArray(intervention.items)).toBe(true);
    expect(intervention.items.length).toBeGreaterThan(0);
  });

  it('should have follow-up metrics defined', async () => {
    const templates = await db.getAllProtocolTemplates();
    const template = templates[0];
    
    const followUp = template.templateData.followUp;
    expect(followUp.frequency).toBeDefined();
    expect(Array.isArray(followUp.metrics)).toBe(true);
    expect(followUp.metrics.length).toBeGreaterThan(0);
  });

  it('should retrieve template by ID', async () => {
    const templates = await db.getAllProtocolTemplates();
    const firstTemplate = templates[0];
    
    const retrievedTemplate = await db.getProtocolTemplateById(firstTemplate.id);
    
    expect(retrievedTemplate).toBeDefined();
    expect(retrievedTemplate?.id).toBe(firstTemplate.id);
    expect(retrievedTemplate?.name).toBe(firstTemplate.name);
  });

  it('should search templates by keyword', async () => {
    const results = await db.searchProtocolTemplates('hypertension');
    
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    
    const hasHypertension = results.some(t => 
      t.name.toLowerCase().includes('hypertension') ||
      t.description.toLowerCase().includes('hypertension')
    );
    expect(hasHypertension).toBe(true);
  });
});
