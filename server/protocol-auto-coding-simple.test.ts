import { describe, it, expect } from 'vitest';
import * as db from './db';

describe('Protocol Auto-Coding Integration (Simplified)', () => {
  describe('Semantic Processor Integration', () => {
    it('should process clinical note and generate ICD-10, CPT, and SNOMED codes', async () => {
      const { processClinicalNote } = await import('./semanticProcessor');

      const result = await processClinicalNote({
        chiefComplaint: 'High blood pressure',
        historyOfPresentIllness: 'Patient reports elevated blood pressure readings at home, averaging 150/95 mmHg',
        assessment: 'Essential hypertension, uncontrolled',
        plan: 'Start Lisinopril 10mg daily. Lifestyle modifications: reduce sodium, increase exercise. Follow up in 2 weeks.',
      });

      // Verify structure
      expect(result).toBeDefined();
      expect(result.icd10Codes).toBeDefined();
      expect(result.cptCodes).toBeDefined();
      expect(result.snomedConcepts).toBeDefined();

      // Verify ICD-10 codes
      expect(result.icd10Codes.length).toBeGreaterThan(0);
      const htnCode = result.icd10Codes.find((c) => c.code.startsWith('I10') || c.code.startsWith('I11'));
      expect(htnCode).toBeDefined();
      expect(htnCode?.confidence).toBeGreaterThan(0.5);
      expect(htnCode?.category).toBe('primary');

      // Verify CPT codes
      expect(result.cptCodes.length).toBeGreaterThan(0);
      const visitCode = result.cptCodes.find((c) => c.code.startsWith('99'));
      expect(visitCode).toBeDefined();

      // Verify SNOMED concepts
      expect(result.snomedConcepts.length).toBeGreaterThan(0);
    }, 60000);

    it('should store generated codes in database', async () => {
      // Create a test code
      const codeId = await db.createMedicalCode({
        codeType: 'ICD10',
        code: 'I10',
        description: 'Essential (primary) hypertension',
        category: 'primary',
        searchTerms: 'hypertension high blood pressure essential',
      });

      expect(codeId).toBeDefined();
      expect(typeof codeId).toBe('number');

      // Search for the code
      const searchResults = await db.searchMedicalCodes({
        searchTerm: 'hypertension',
        codeType: 'ICD10',
        limit: 10,
      });

      expect(searchResults.length).toBeGreaterThan(0);
      const foundCode = searchResults.find((c) => c.code === 'I10');
      expect(foundCode).toBeDefined();
      expect(foundCode?.description).toContain('hypertension');
    });

    it('should handle multiple code types (ICD-10, CPT, SNOMED)', async () => {
      // Create ICD-10 code
      const icd10Id = await db.createMedicalCode({
        codeType: 'ICD10',
        code: 'E11.9',
        description: 'Type 2 diabetes mellitus without complications',
        category: 'primary',
        searchTerms: 'diabetes type 2 mellitus',
      });

      // Create CPT code
      const cptId = await db.createMedicalCode({
        codeType: 'CPT',
        code: '99213',
        description: 'Office visit, established patient, level 3',
        category: '',
        searchTerms: 'office visit established patient level 3',
      });

      // Create SNOMED code
      const snomedId = await db.createMedicalCode({
        codeType: 'SNOMED',
        code: '44054006',
        description: 'Diabetes mellitus type 2',
        category: 'disorder',
        searchTerms: 'diabetes mellitus type 2 disorder',
      });

      expect(icd10Id).toBeDefined();
      expect(cptId).toBeDefined();
      expect(snomedId).toBeDefined();

      // Verify all codes can be searched
      const allCodes = await db.searchMedicalCodes({
        searchTerm: '',
        limit: 100,
      });

      expect(allCodes.some((c) => c.code === 'E11.9')).toBe(true);
      expect(allCodes.some((c) => c.code === '99213')).toBe(true);
      expect(allCodes.some((c) => c.code === '44054006')).toBe(true);
    });
  });

  describe('Code Search and Retrieval', () => {
    it('should search codes by term', async () => {
      const results = await db.searchMedicalCodes({
        searchTerm: 'diabetes',
        limit: 10,
      });

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      results.forEach((code) => {
        expect(code.searchTerms?.toLowerCase()).toContain('diabetes');
      });
    });


  });

  describe('Protocol Integration Workflow', () => {
    it('should demonstrate complete auto-coding workflow', async () => {
      const { processClinicalNote } = await import('./semanticProcessor');

      // Step 1: Process clinical note (simulating protocol generation)
      const codingResult = await processClinicalNote({
        chiefComplaint: 'Uncontrolled hypertension',
        assessment: 'Essential hypertension',
        plan: 'Initiate antihypertensive therapy with ACE inhibitor',
      });

      expect(codingResult.icd10Codes.length).toBeGreaterThan(0);

      // Step 2: Store codes in database
      const storedCodeIds: number[] = [];

      for (const icd10 of codingResult.icd10Codes) {
        const existingCodes = await db.searchMedicalCodes({
          searchTerm: icd10.code,
          codeType: 'ICD10',
          limit: 1,
        });

        let codeId: number;
        if (existingCodes.length > 0) {
          codeId = existingCodes[0].id!;
        } else {
          codeId = (await db.createMedicalCode({
            codeType: 'ICD10',
            code: icd10.code,
            description: icd10.description,
            category: icd10.category,
            searchTerms: icd10.description.toLowerCase(),
          })) as number;
        }

        storedCodeIds.push(codeId);
      }

      // Step 3: Verify codes were stored
      expect(storedCodeIds.length).toBeGreaterThan(0);
      storedCodeIds.forEach((id) => {
        expect(typeof id).toBe('number');
        expect(id).toBeGreaterThan(0);
      });
    }, 60000);
  });
});
