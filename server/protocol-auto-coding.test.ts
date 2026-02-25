import { describe, it, expect, beforeAll } from 'vitest';
import * as db from './db';

describe('Protocol Auto-Coding Integration', () => {
  let testUserId: number;
  let testCarePlanId: number;
  let testProtocolDeliveryId: number;

  beforeAll(async () => {
    // Create test user
    const testOpenId = `test-autocoding-${Date.now()}`;
    await db.upsertUser({
      openId: testOpenId,
      email: `${testOpenId}@example.com`,
      name: 'Test Auto-Coding Patient',
      role: 'user',
    });
    const user = await db.getUserByOpenId(testOpenId);
    testUserId = user!.id;

    // Create test care plan
    const carePlanId = await db.createPatientCarePlan({
      patientId: testUserId,
      physicianId: testUserId, // Use same ID for simplicity in test
      title: 'Hypertension Management Protocol',
      diagnosis: 'Essential hypertension',
      goals: ['Lower blood pressure to <130/80 mmHg', 'Reduce cardiovascular risk'],
      medications: [
        { name: 'Lisinopril', dosage: '10mg', frequency: 'once daily' },
        { name: 'Amlodipine', dosage: '5mg', frequency: 'once daily' },
      ],
      monitoring: ['Blood pressure', 'Heart rate'],
      checkInFrequency: 'weekly',
      nextCheckInDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      startDate: new Date(),
      status: 'active',
    });
    testCarePlanId = carePlanId as number;

    // Create test protocol delivery
    const deliveryId = await db.createProtocolDelivery({
      userId: testUserId,
      carePlanId: testCarePlanId,
      protocolName: 'Hypertension Management Protocol',
      deliveryType: 'manual',
      emailSent: true,
      pdfGenerated: true,
      sentAt: new Date(),
    });
    testProtocolDeliveryId = deliveryId.insertId as number;
  });

  describe('Medical Code Storage', () => {
    it('should store ICD-10 codes in database', async () => {
      // Create ICD-10 code
      const codeId = await db.createMedicalCode({
        codeType: 'ICD10',
        code: 'I10',
        description: 'Essential (primary) hypertension',
        category: 'primary',
        searchTerms: 'hypertension high blood pressure',
      });

      expect(codeId).toBeDefined();
      expect(typeof codeId).toBe('number');

      // Assign to protocol
      const assignmentId = await db.assignMedicalCodeToProtocol({
        protocolDeliveryId: testProtocolDeliveryId,
        carePlanId: testCarePlanId,
        medicalCodeId: codeId as number,
        codeType: 'ICD10',
        isPrimary: true,
        assignmentMethod: 'automatic',
      });

      expect(assignmentId).toBeDefined();
    });

    it('should store CPT codes in database', async () => {
      // Create CPT code
      const codeId = await db.createMedicalCode({
        codeType: 'CPT',
        code: '99213',
        description: 'Office visit, established patient, level 3',
        category: '',
        searchTerms: 'office visit established patient',
      });

      expect(codeId).toBeDefined();

      // Assign to protocol
      const assignmentId = await db.assignMedicalCodeToProtocol({
        protocolDeliveryId: testProtocolDeliveryId,
        carePlanId: testCarePlanId,
        medicalCodeId: codeId as number,
        codeType: 'CPT',
        assignmentMethod: 'automatic',
      });

      expect(assignmentId).toBeDefined();
    });

    it('should store SNOMED codes in database', async () => {
      // Create SNOMED code
      const codeId = await db.createMedicalCode({
        codeType: 'SNOMED',
        code: '38341003',
        description: 'Hypertensive disorder',
        category: 'disorder',
        searchTerms: 'hypertension disorder',
      });

      expect(codeId).toBeDefined();

      // Assign to protocol
      const assignmentId = await db.assignMedicalCodeToProtocol({
        protocolDeliveryId: testProtocolDeliveryId,
        carePlanId: testCarePlanId,
        medicalCodeId: codeId as number,
        codeType: 'SNOMED',
        assignmentMethod: 'automatic',
      });

      expect(assignmentId).toBeDefined();
    });
  });

  describe('Code Retrieval', () => {
    it('should retrieve all codes for a protocol', async () => {
      const codes = await db.getProtocolMedicalCodes(testProtocolDeliveryId);

      expect(codes).toBeDefined();
      expect(Array.isArray(codes)).toBe(true);
      expect(codes.length).toBeGreaterThan(0);

      // Verify ICD-10 code exists
      const icd10Code = codes.find((c) => c.codeType === 'ICD10');
      expect(icd10Code).toBeDefined();
      expect(icd10Code?.code).toBe('I10');
      expect(icd10Code?.isPrimary).toBe(1); // MySQL returns boolean as 1/0

      // Verify CPT code exists
      const cptCode = codes.find((c) => c.codeType === 'CPT');
      expect(cptCode).toBeDefined();
      expect(cptCode?.code).toBe('99213');

      // Verify SNOMED code exists
      const snomedCode = codes.find((c) => c.codeType === 'SNOMED');
      expect(snomedCode).toBeDefined();
      expect(snomedCode?.code).toBe('38341003');
    });

    it('should search medical codes by term', async () => {
      const results = await db.searchMedicalCodes({
        searchTerm: 'hypertension',
        limit: 10,
      });

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      // Should find ICD-10 code
      const icd10 = results.find((r) => r.code === 'I10');
      expect(icd10).toBeDefined();
      expect(icd10?.codeType).toBe('ICD10');
    });

    it('should filter search by code type', async () => {
      const cptResults = await db.searchMedicalCodes({
        searchTerm: 'office',
        codeType: 'CPT',
        limit: 10,
      });

      expect(cptResults).toBeDefined();
      expect(cptResults.every((r) => r.codeType === 'CPT')).toBe(true);
    });
  });

  describe('Code Verification', () => {
    it('should support manual code verification', async () => {
      // Get a code assignment
      const codes = await db.getProtocolMedicalCodes(testProtocolDeliveryId);
      const icd10Assignment = codes.find((c) => c.codeType === 'ICD10');

      expect(icd10Assignment).toBeDefined();
      expect(icd10Assignment?.assignmentMethod).toBe('automatic');
      expect(icd10Assignment?.verifiedBy).toBeNull();
    });
  });

  describe('Integration with Semantic Processor', () => {
    it('should process clinical note and generate codes', async () => {
      const { processClinicalNote } = await import('./semanticProcessor');

      const result = await processClinicalNote({
        chiefComplaint: 'High blood pressure',
        historyOfPresentIllness: 'Patient reports elevated blood pressure readings at home',
        assessment: 'Essential hypertension',
        plan: 'Start Lisinopril 10mg daily. Monitor blood pressure. Follow up in 2 weeks.',
      });

      expect(result).toBeDefined();
      expect(result.icd10Codes).toBeDefined();
      expect(result.icd10Codes.length).toBeGreaterThan(0);
      expect(result.cptCodes).toBeDefined();
      expect(result.snomedConcepts).toBeDefined();

      // Verify ICD-10 code for hypertension
      const htnCode = result.icd10Codes.find((c) => c.code.startsWith('I10') || c.code.startsWith('I11'));
      expect(htnCode).toBeDefined();
      expect(htnCode?.confidence).toBeGreaterThan(0.5);
    }, 60000);
  });
});
