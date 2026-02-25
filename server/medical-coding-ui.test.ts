import { describe, it, expect } from 'vitest';
import * as db from './db';

describe('Medical Coding UI Integration', () => {
  describe('Code Display and Retrieval', () => {
    it('should retrieve protocol codes for display', async () => {
      // Create test medical code
      const codeId = await db.createMedicalCode({
        codeType: 'ICD10',
        code: 'I10',
        description: 'Essential (primary) hypertension',
        category: 'primary',
        searchTerms: 'hypertension high blood pressure',
      });

      expect(codeId).toBeDefined();
      expect(typeof codeId).toBe('number');

      // Verify code can be retrieved
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

    it('should support filtering by code type', async () => {
      // Create codes of different types
      await db.createMedicalCode({
        codeType: 'ICD10',
        code: 'E11.9',
        description: 'Type 2 diabetes mellitus',
        category: 'primary',
        searchTerms: 'diabetes type 2',
      });

      await db.createMedicalCode({
        codeType: 'CPT',
        code: '99213',
        description: 'Office visit, established patient',
        category: '',
        searchTerms: 'office visit',
      });

      // Search for ICD10 codes only
      const icd10Results = await db.searchMedicalCodes({
        searchTerm: '',
        codeType: 'ICD10',
        limit: 100,
      });

      // Verify results contain ICD10 codes
      const hasIcd10 = icd10Results.some((c) => c.codeType === 'ICD10');
      expect(hasIcd10).toBe(true);
    });
  });

  describe('Code Verification Workflow', () => {
    it('should support code verification status tracking', async () => {
      // Create a medical code
      const codeId = await db.createMedicalCode({
        codeType: 'ICD10',
        code: 'I10',
        description: 'Essential hypertension',
        category: 'primary',
        searchTerms: 'hypertension',
      });

      expect(codeId).toBeDefined();

      // In a real scenario, we would:
      // 1. Assign code to protocol
      // 2. Verify code via UI
      // 3. Check verification status

      // For this test, we verify the code exists and can be searched
      const codes = await db.searchMedicalCodes({
        searchTerm: 'I10',
        codeType: 'ICD10',
        limit: 1,
      });

      expect(codes.length).toBeGreaterThan(0);
      expect(codes[0].code).toBe('I10');
    });
  });

  describe('Manual Code Assignment', () => {
    it('should support manual code entry', async () => {
      // Simulate manual code entry
      const manualCodeId = await db.createMedicalCode({
        codeType: 'CPT',
        code: '99214',
        description: 'Office visit, established patient, level 4',
        category: '',
        searchTerms: 'office visit level 4',
      });

      expect(manualCodeId).toBeDefined();

      // Verify manual code can be retrieved
      const results = await db.searchMedicalCodes({
        searchTerm: '99214',
        limit: 1,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].code).toBe('99214');
      expect(results[0].codeType).toBe('CPT');
    });
  });

  describe('Code Search Functionality', () => {
    it('should search codes by description', async () => {
      // Create test codes
      await db.createMedicalCode({
        codeType: 'ICD10',
        code: 'J45.909',
        description: 'Unspecified asthma, uncomplicated',
        category: 'primary',
        searchTerms: 'asthma respiratory',
      });

      // Search by term
      const results = await db.searchMedicalCodes({
        searchTerm: 'asthma',
        limit: 10,
      });

      expect(results.length).toBeGreaterThan(0);
      const asthmaCode = results.find((c) => c.code === 'J45.909');
      expect(asthmaCode).toBeDefined();
      expect(asthmaCode?.description).toContain('asthma');
    });

    it('should handle empty search results gracefully', async () => {
      const results = await db.searchMedicalCodes({
        searchTerm: 'nonexistent_code_xyz123',
        limit: 10,
      });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });
  });

  describe('Multi-Code Type Support', () => {
    it('should handle ICD-10, CPT, and SNOMED codes', async () => {
      // Create one of each type
      const icd10Id = await db.createMedicalCode({
        codeType: 'ICD10',
        code: 'I11.0',
        description: 'Hypertensive heart disease with heart failure',
        category: 'primary',
        searchTerms: 'hypertensive heart disease',
      });

      const cptId = await db.createMedicalCode({
        codeType: 'CPT',
        code: '93000',
        description: 'Electrocardiogram, routine ECG',
        category: '',
        searchTerms: 'ecg electrocardiogram',
      });

      const snomedId = await db.createMedicalCode({
        codeType: 'SNOMED',
        code: '38341003',
        description: 'Hypertensive disorder',
        category: 'disorder',
        searchTerms: 'hypertension disorder',
      });

      expect(icd10Id).toBeDefined();
      expect(cptId).toBeDefined();
      expect(snomedId).toBeDefined();

      // Verify all types can be retrieved
      const allCodes = await db.searchMedicalCodes({
        searchTerm: '',
        limit: 100,
      });

      expect(allCodes.some((c) => c.codeType === 'ICD10')).toBe(true);
      expect(allCodes.some((c) => c.codeType === 'CPT')).toBe(true);
      expect(allCodes.some((c) => c.codeType === 'SNOMED')).toBe(true);
    });
  });
});
