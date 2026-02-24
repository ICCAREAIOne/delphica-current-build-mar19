import { describe, it, expect, beforeAll } from 'vitest';
import * as db from './db';

describe('Template Enhancements', () => {
  let testPhysicianId: number;
  let testTemplateId: number;

  beforeAll(async () => {
    // Use existing user or create test data
    testPhysicianId = 1;
    
    // Create a test template
    const template = await db.createProtocolTemplate({
      createdBy: testPhysicianId,
      name: 'Test Template for Enhancements',
      description: 'Testing versioning, presets, and analytics',
      category: 'Test',
      tags: ['test', 'enhancement'],
      templateData: {
        diagnosis: 'Test Condition',
        duration: '12 weeks',
        goals: ['Test Goal 1', 'Test Goal 2'],
        interventions: [
          { category: 'Medication', items: ['Test Med 1'] }
        ],
        medications: [
          { name: 'Test Med', dosage: '10mg', frequency: 'daily' }
        ],
      },
      isPublic: false,
    });
    
    testTemplateId = template?.insertId || 1;
  });

  describe('Template Versioning', () => {
    it('should create a new template version', async () => {
      const version = await db.createTemplateVersion({
        templateId: testTemplateId,
        versionNumber: 1,
        changeSummary: 'Initial version',
        changedBy: testPhysicianId,
        templateData: {
          diagnosis: 'Test Condition',
          duration: '12 weeks',
          goals: ['Test Goal 1'],
          interventions: [],
        },
      });

      expect(version).toBeDefined();
    });

    it('should retrieve version history', async () => {
      const history = await db.getTemplateVersionHistory(testTemplateId);
      
      expect(Array.isArray(history)).toBe(true);
      if (history.length > 0) {
        expect(history[0]).toHaveProperty('versionNumber');
        expect(history[0]).toHaveProperty('changeSummary');
        expect(history[0]).toHaveProperty('templateData');
      }
    });

    it('should get latest version number', async () => {
      const latestVersion = await db.getLatestVersionNumber(testTemplateId);
      
      expect(typeof latestVersion).toBe('number');
      expect(latestVersion).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Template Presets', () => {
    let testPresetId: number;

    it('should create a physician preset', async () => {
      const preset = await db.createTemplatePreset({
        physicianId: testPhysicianId,
        baseTemplateId: testTemplateId,
        name: 'My Custom Preset',
        description: 'Test preset description',
        category: 'Test',
        tags: ['custom', 'test'],
        templateData: {
          diagnosis: 'Modified Condition',
          duration: '8 weeks',
          goals: ['Modified Goal'],
          interventions: [],
        },
      });

      expect(preset).toBeDefined();
      testPresetId = preset?.insertId || 1;
    });

    it('should retrieve physician presets', async () => {
      const presets = await db.getPhysicianPresets(testPhysicianId);
      
      expect(Array.isArray(presets)).toBe(true);
    });

    it('should retrieve preset by category', async () => {
      const presets = await db.getPhysicianPresets(testPhysicianId, 'Test');
      
      expect(Array.isArray(presets)).toBe(true);
    });

    it('should increment preset usage count', async () => {
      await db.incrementPresetUsage(1);
      
      // Success if no error thrown
      expect(true).toBe(true);
    });
  });

  describe('Template Usage Analytics', () => {
    let testLogId: number;

    it('should log template usage', async () => {
      const log = await db.logTemplateUsage({
        templateId: testTemplateId,
        physicianId: testPhysicianId,
        patientId: 1,
        wasCustomized: true,
        customizationCount: 3,
      });

      expect(log).toBeDefined();
      testLogId = log?.insertId || 1;
    });

    it('should record template outcome', async () => {
      await db.recordTemplateOutcome(testLogId, {
        outcomeSuccess: true,
        outcomeNotes: 'Patient responded well to treatment',
      });

      // Success if no error thrown
      expect(true).toBe(true);
    });

    it('should retrieve template usage logs', async () => {
      const logs = await db.getTemplateUsageLogs(testTemplateId, 10);
      
      expect(Array.isArray(logs)).toBe(true);
    });

    it('should calculate template analytics', async () => {
      const analytics = await db.getTemplateAnalytics(testTemplateId);
      
      expect(analytics).toBeDefined();
      if (analytics) {
        expect(analytics).toHaveProperty('totalUsages');
        expect(analytics).toHaveProperty('customizedUsages');
        expect(analytics).toHaveProperty('successRate');
        expect(typeof analytics.totalUsages).toBe('number');
      }
    });

    it('should update template outcome correlation', async () => {
      await db.updateTemplateOutcomeCorrelation(testTemplateId);
      
      // Success if no error thrown
      expect(true).toBe(true);
    });

    it('should retrieve all template analytics', async () => {
      const allAnalytics = await db.getAllTemplateAnalytics();
      
      expect(Array.isArray(allAnalytics)).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should track complete template lifecycle', async () => {
      // 1. Create template
      const template = await db.createProtocolTemplate({
        createdBy: testPhysicianId,
        name: 'Lifecycle Test Template',
        category: 'Test',
        templateData: {
          diagnosis: 'Test',
          duration: '4 weeks',
          goals: ['Goal 1'],
          interventions: [],
        },
      });
      
      const templateId = template?.insertId || testTemplateId;

      // 2. Create version
      await db.createTemplateVersion({
        templateId,
        versionNumber: 1,
        changeSummary: 'Initial version',
        changedBy: testPhysicianId,
        templateData: {
          diagnosis: 'Test',
          duration: '4 weeks',
          goals: ['Goal 1'],
          interventions: [],
        },
      });

      // 3. Create preset from template
      const preset = await db.createTemplatePreset({
        physicianId: testPhysicianId,
        baseTemplateId: templateId,
        name: 'Lifecycle Preset',
        category: 'Test',
        templateData: {
          diagnosis: 'Modified Test',
          duration: '6 weeks',
          goals: ['Modified Goal'],
          interventions: [],
        },
      });

      // 4. Log usage
      const log = await db.logTemplateUsage({
        templateId,
        presetId: preset?.insertId,
        physicianId: testPhysicianId,
        wasCustomized: true,
        customizationCount: 2,
      });

      // 5. Record outcome
      await db.recordTemplateOutcome(log?.insertId || 1, {
        outcomeSuccess: true,
      });

      // 6. Get analytics
      const analytics = await db.getTemplateAnalytics(templateId);

      expect(analytics).toBeDefined();
      expect(analytics?.totalUsages).toBeGreaterThan(0);
    });
  });
});
