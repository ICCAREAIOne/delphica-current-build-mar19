import { describe, it, expect } from 'vitest';
import * as db from './db';

describe('UI Integration - Template Enhancement Components', () => {
  describe('Template Library Integration', () => {
    it('should retrieve templates for library display', async () => {
      const templates = await db.getAllProtocolTemplates();
      
      expect(Array.isArray(templates)).toBe(true);
      // Should have the 5 AI-generated templates
      expect(templates.length).toBeGreaterThanOrEqual(5);
      
      if (templates.length > 0) {
        const template = templates[0];
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('category');
        expect(template).toHaveProperty('templateData');
      }
    });

    it('should support version history retrieval for templates', async () => {
      const templates = await db.getAllProtocolTemplates();
      
      if (templates.length > 0) {
        const templateId = templates[0].id;
        const versions = await db.getTemplateVersionHistory(templateId);
        
        expect(Array.isArray(versions)).toBe(true);
      }
    });

    it('should support analytics retrieval for templates', async () => {
      const templates = await db.getAllProtocolTemplates();
      
      if (templates.length > 0) {
        const templateId = templates[0].id;
        const analytics = await db.getTemplateAnalytics(templateId);
        
        // Analytics may be null if no usage yet
        if (analytics) {
          expect(analytics).toHaveProperty('totalUsages');
          expect(analytics).toHaveProperty('customizedUsages');
        }
      }
    });
  });

  describe('Preset Management Integration', () => {
    let testPhysicianId: number;
    let testTemplateId: number;
    let testPresetId: number;

    it('should create preset from customized protocol', async () => {
      testPhysicianId = 1;
      const templates = await db.getAllProtocolTemplates();
      testTemplateId = templates[0]?.id || 1;

      const preset = await db.createTemplatePreset({
        physicianId: testPhysicianId,
        baseTemplateId: testTemplateId,
        name: 'UI Integration Test Preset',
        description: 'Testing preset creation from UI',
        category: 'Test',
        tags: ['test', 'ui-integration'],
        templateData: {
          diagnosis: 'Test Condition',
          duration: '8 weeks',
          goals: ['Test Goal'],
          interventions: [],
        },
      });

      expect(preset).toBeDefined();
      testPresetId = preset?.insertId || 1;
    });

    it('should retrieve physician presets for preset manager', async () => {
      const presets = await db.getPhysicianPresets(testPhysicianId);
      
      expect(Array.isArray(presets)).toBe(true);
      expect(presets.length).toBeGreaterThan(0);
      
      const preset = presets.find(p => p.name === 'UI Integration Test Preset');
      expect(preset).toBeDefined();
    });

    it('should apply preset to customization dialog', async () => {
      const presets = await db.getPhysicianPresets(testPhysicianId);
      const preset = presets.find(p => p.name === 'UI Integration Test Preset');
      
      expect(preset).toBeDefined();
      expect(preset?.templateData).toHaveProperty('diagnosis');
      expect(preset?.templateData).toHaveProperty('goals');
    });
  });

  describe('Customization Dialog Integration', () => {
    it('should support saving customized protocol as preset', async () => {
      const customProtocol = {
        diagnosis: 'Customized Hypertension',
        duration: '10 weeks',
        goals: ['Custom Goal 1', 'Custom Goal 2'],
        interventions: [
          { category: 'Medication', items: ['Custom Med'] }
        ],
        medications: [
          { name: 'Custom Drug', dosage: '20mg', frequency: 'twice daily' }
        ],
      };

      const preset = await db.createTemplatePreset({
        physicianId: 1,
        name: 'Customized Protocol Preset',
        category: 'Hypertension',
        templateData: customProtocol,
      });

      expect(preset).toBeDefined();
    });

    it('should track template usage when applied from library', async () => {
      const templates = await db.getAllProtocolTemplates();
      const templateId = templates[0]?.id || 1;

      const log = await db.logTemplateUsage({
        templateId,
        physicianId: 1,
        patientId: 1,
        wasCustomized: true,
        customizationCount: 3,
      });

      expect(log).toBeDefined();
    });
  });

  describe('Analytics Dashboard Integration', () => {
    it('should retrieve all template analytics for dashboard', async () => {
      const allAnalytics = await db.getAllTemplateAnalytics();
      
      expect(Array.isArray(allAnalytics)).toBe(true);
    });

    it('should calculate success rates for templates', async () => {
      const templates = await db.getAllProtocolTemplates();
      
      if (templates.length > 0) {
        const templateId = templates[0].id;
        
        // Log usage with outcome
        const log = await db.logTemplateUsage({
          templateId,
          physicianId: 1,
          patientId: 1,
          wasCustomized: false,
          customizationCount: 0,
        });

        await db.recordTemplateOutcome(log?.insertId || 1, {
          outcomeSuccess: true,
          outcomeNotes: 'Test outcome',
        });

        await db.updateTemplateOutcomeCorrelation(templateId);

        const analytics = await db.getTemplateAnalytics(templateId);
        
        expect(analytics).toBeDefined();
        if (analytics && analytics.recordedOutcomes > 0) {
          expect(analytics.successRate).toBeGreaterThanOrEqual(0);
          expect(analytics.successRate).toBeLessThanOrEqual(100);
        }
      }
    });
  });

  describe('Version History Integration', () => {
    it('should create version when template is updated', async () => {
      const templates = await db.getAllProtocolTemplates();
      const templateId = templates[0]?.id || 1;

      const latestVersion = await db.getLatestVersionNumber(templateId);
      const newVersion = latestVersion + 1;

      const version = await db.createTemplateVersion({
        templateId,
        versionNumber: newVersion,
        changeSummary: 'UI integration test version',
        changedBy: 1,
        templateData: {
          diagnosis: 'Updated Diagnosis',
          duration: '12 weeks',
          goals: ['Updated Goal'],
          interventions: [],
        },
      });

      expect(version).toBeDefined();
    });

    it('should retrieve version history for display', async () => {
      const templates = await db.getAllProtocolTemplates();
      const templateId = templates[0]?.id || 1;

      const history = await db.getTemplateVersionHistory(templateId);
      
      expect(Array.isArray(history)).toBe(true);
    });
  });
});
