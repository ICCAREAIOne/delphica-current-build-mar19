import { describe, it, expect } from 'vitest';
import * as db from './db';
import { comprehensiveDrugSafetyCheck } from './drugInteractionService';

describe('MVP Phase 2 Features', () => {
  describe('Audit Trail System', () => {
    it('should have audit trail database functions', () => {
      expect(db.createProtocolAudit).toBeDefined();
      expect(db.getProtocolAuditsByPatient).toBeDefined();
    });

    it('should create audit trail with customization details', async () => {
      // Create required foreign key records first
      const delivery = await db.createProtocolDelivery({
        userId: 1,
        carePlanId: 1,
        protocolName: 'Test Protocol',
        pdfUrl: 'test.pdf',
        pdfKey: 'test-key',
        emailSent: true,
        sentAt: new Date(),
      });

      const auditData = {
        protocolDeliveryId: delivery.id,
        carePlanId: 1,
        physicianId: 1,
        patientId: 1,
        originalProtocol: {
          title: 'Original Protocol',
          diagnosis: 'Hypertension',
          duration: '12 weeks',
          goals: ['Lower BP'],
          interventions: [],
          medications: [{ name: 'Lisinopril', dosage: '10mg', frequency: 'Daily' }],
        },
        customizedProtocol: {
          title: 'Customized Protocol',
          diagnosis: 'Hypertension',
          duration: '12 weeks',
          goals: ['Lower BP', 'Reduce sodium'],
          interventions: [],
          medications: [{ name: 'Lisinopril', dosage: '20mg', frequency: 'Daily' }],
        },
        changesSummary: [
          {
            field: 'medications',
            changeType: 'modified' as const,
            oldValue: 'Lisinopril 10mg',
            newValue: 'Lisinopril 20mg',
          },
        ],
        allergenConflictsResolved: [],
        customizationReason: 'Increased dosage for better BP control',
      };

      const result = await db.createProtocolAudit(auditData);
      expect(result).toBeDefined();
      expect(result.id).toBeGreaterThan(0);
    });

    it('should retrieve audit trail by patient', async () => {
      const audits = await db.getProtocolAuditsByPatient(1);
      expect(Array.isArray(audits)).toBe(true);
    });
  });

  describe('Protocol Templates Library', () => {
    it('should have template database functions', () => {
      expect(db.getAllProtocolTemplates).toBeDefined();
      expect(db.getProtocolTemplateById).toBeDefined();
      expect(db.createProtocolTemplate).toBeDefined();
      expect(db.searchProtocolTemplates).toBeDefined();
      expect(db.incrementTemplateUsage).toBeDefined();
    });

    it('should create a protocol template', async () => {
      const templateData = {
        createdBy: 1,
        name: 'Hypertension Management',
        description: 'Standard protocol for managing hypertension',
        category: 'Cardiovascular',
        tags: ['hypertension', 'blood pressure', 'cardiovascular'],
        templateData: {
          diagnosis: 'Essential Hypertension',
          duration: '12 weeks',
          goals: ['Reduce systolic BP below 130 mmHg', 'Reduce diastolic BP below 80 mmHg'],
          interventions: [
            {
              category: 'Lifestyle Modifications',
              items: ['DASH diet', 'Regular exercise 30 min/day', 'Limit sodium to 2g/day'],
            },
          ],
          medications: [
            {
              name: 'Lisinopril',
              dosage: '10mg',
              frequency: 'Once daily',
              instructions: 'Take in the morning',
            },
          ],
          lifestyle: ['Monitor BP at home daily', 'Keep BP log'],
          followUp: {
            frequency: 'Every 2 weeks',
            metrics: ['Blood pressure', 'Medication adherence', 'Side effects'],
          },
          warnings: ['Monitor for hypotension', 'Watch for dry cough (ACE inhibitor side effect)'],
        },
        isPublic: true,
      };

      const result = await db.createProtocolTemplate(templateData);
      expect(result).toBeDefined();
      expect(result.id).toBeGreaterThan(0);
      expect(result.name).toBe('Hypertension Management');
    });

    it('should retrieve all templates', async () => {
      const templates = await db.getAllProtocolTemplates(1);
      expect(Array.isArray(templates)).toBe(true);
    });

    it('should search templates by term', async () => {
      const results = await db.searchProtocolTemplates('hypertension');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should increment template usage count', async () => {
      // First create a template
      const template = await db.createProtocolTemplate({
        createdBy: 1,
        name: 'Test Template for Usage',
        category: 'Test',
        templateData: {
          diagnosis: 'Test',
          duration: '1 week',
          goals: [],
          interventions: [],
        },
      });

      // Increment usage
      await db.incrementTemplateUsage(template.id);

      // Verify usage count increased
      const updated = await db.getProtocolTemplateById(template.id);
      expect(updated?.usageCount).toBeGreaterThan(0);
    });
  });

  describe('Drug Interaction Database', () => {
    it('should check drug-drug interactions', async () => {
      const medications = [
        { name: 'Warfarin', dosage: '5mg', frequency: 'Daily' },
        { name: 'Aspirin', dosage: '81mg', frequency: 'Daily' },
      ];

      const result = await comprehensiveDrugSafetyCheck(medications, []);

      expect(result).toBeDefined();
      expect(result.drugInteractions).toBeDefined();
      expect(Array.isArray(result.drugInteractions)).toBe(true);
      expect(result.criticalIssuesCount).toBeGreaterThanOrEqual(0);
      expect(result.moderateIssuesCount).toBeGreaterThanOrEqual(0);
      expect(result.minorIssuesCount).toBeGreaterThanOrEqual(0);
    });

    it('should check drug-allergy conflicts', async () => {
      const medications = [
        { name: 'Penicillin', dosage: '500mg', frequency: 'Every 6 hours' },
      ];
      const allergies = ['Penicillin'];

      const result = await comprehensiveDrugSafetyCheck(medications, allergies);

      expect(result).toBeDefined();
      expect(result.allergyConflicts).toBeDefined();
      expect(Array.isArray(result.allergyConflicts)).toBe(true);
    });

    it('should return severity levels for interactions', async () => {
      const medications = [
        { name: 'Warfarin', dosage: '5mg', frequency: 'Daily' },
        { name: 'Aspirin', dosage: '81mg', frequency: 'Daily' },
        { name: 'Ibuprofen', dosage: '400mg', frequency: 'As needed' },
      ];

      const result = await comprehensiveDrugSafetyCheck(medications, []);

      if (result.drugInteractions.length > 0) {
        result.drugInteractions.forEach((interaction) => {
          expect(['critical', 'moderate', 'minor']).toContain(interaction.severity);
          expect(interaction.description).toBeDefined();
          expect(interaction.recommendation).toBeDefined();
        });
      }
    });

    it('should handle empty medication list', async () => {
      const result = await comprehensiveDrugSafetyCheck([], []);

      expect(result.drugInteractions).toHaveLength(0);
      expect(result.allergyConflicts).toHaveLength(0);
      expect(result.criticalIssuesCount).toBe(0);
    });

    it('should handle single medication (no interactions)', async () => {
      const medications = [
        { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily' },
      ];

      const result = await comprehensiveDrugSafetyCheck(medications, []);

      expect(result.drugInteractions).toHaveLength(0);
    });
  });

  describe('Integration Tests', () => {
    it('should integrate audit trail with customization workflow', async () => {
      // Create required foreign key record
      const delivery = await db.createProtocolDelivery({
        userId: 1,
        carePlanId: 1,
        protocolName: 'Diabetes Management Protocol',
        pdfUrl: 'test.pdf',
        pdfKey: 'test-key',
        emailSent: true,
        sentAt: new Date(),
      });

      // Create a protocol template
      const template = await db.createProtocolTemplate({
        createdBy: 1,
        name: 'Diabetes Management',
        category: 'Endocrinology',
        templateData: {
          diagnosis: 'Type 2 Diabetes',
          duration: '12 weeks',
          goals: ['HbA1c < 7%'],
          interventions: [],
          medications: [{ name: 'Metformin', dosage: '500mg', frequency: 'Twice daily' }],
        },
      });

      // Simulate customization
      const customizedProtocol = {
        ...template.templateData,
        medications: [{ name: 'Metformin', dosage: '1000mg', frequency: 'Twice daily' }],
      };

      // Create audit trail
      const audit = await db.createProtocolAudit({
        protocolDeliveryId: delivery.id,
        carePlanId: 1,
        physicianId: 1,
        patientId: 1,
        originalProtocol: {
          title: template.name,
          diagnosis: template.templateData.diagnosis,
          duration: template.templateData.duration,
          goals: template.templateData.goals,
          interventions: template.templateData.interventions,
          medications: template.templateData.medications || [],
        },
        customizedProtocol: {
          title: template.name,
          diagnosis: customizedProtocol.diagnosis,
          duration: customizedProtocol.duration,
          goals: customizedProtocol.goals,
          interventions: customizedProtocol.interventions,
          medications: customizedProtocol.medications || [],
        },
        changesSummary: [
          {
            field: 'medications',
            changeType: 'modified',
            oldValue: 'Metformin 500mg',
            newValue: 'Metformin 1000mg',
          },
        ],
        allergenConflictsResolved: [],
        customizationReason: 'Increased dosage for better glycemic control',
      });

      expect(audit.id).toBeGreaterThan(0);
      expect(audit.customizationReason).toBe('Increased dosage for better glycemic control');
    });

    it('should integrate drug safety check with protocol customization', async () => {
      const medications = [
        { name: 'Warfarin', dosage: '5mg', frequency: 'Daily' },
        { name: 'Aspirin', dosage: '81mg', frequency: 'Daily' },
      ];
      const allergies = ['Sulfa drugs'];

      const safetyCheck = await comprehensiveDrugSafetyCheck(medications, allergies);

      // Verify safety check returns expected structure
      expect(safetyCheck).toBeDefined();
      expect(safetyCheck.drugInteractions).toBeDefined();
      expect(safetyCheck.allergyConflicts).toBeDefined();
      expect(typeof safetyCheck.criticalIssuesCount).toBe('number');
      expect(typeof safetyCheck.moderateIssuesCount).toBe('number');
      expect(typeof safetyCheck.minorIssuesCount).toBe('number');

      // If there are interactions, verify they have proper structure
      if (safetyCheck.drugInteractions.length > 0) {
        const interaction = safetyCheck.drugInteractions[0];
        expect(interaction.drug1).toBeDefined();
        expect(interaction.drug2).toBeDefined();
        expect(interaction.severity).toBeDefined();
        expect(interaction.description).toBeDefined();
        expect(interaction.recommendation).toBeDefined();
      }
    });
  });
});
