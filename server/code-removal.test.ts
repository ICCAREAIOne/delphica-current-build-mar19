import { describe, it, expect } from 'vitest';
import * as db from './db';

describe('Code Removal Feature', () => {
  it('should remove code assignment from database', async () => {
    // Create test medical code
    const codeId = await db.createMedicalCode({
      codeType: 'ICD10',
      code: 'I10',
      description: 'Essential (primary) hypertension',
      codeSystem: 'ICD-10-CM',
      codeVersion: '2024',
    });

    // Create test protocol code assignment
    const assignmentId = await db.assignMedicalCodeToProtocol({
      protocolDeliveryId: 1,
      medicalCodeId: codeId,
      codeType: 'ICD10',
      assignmentMethod: 'automatic',
    });

    // Remove the code assignment
    const result = await db.removeCodeAssignment(assignmentId);
    expect(result).toBe(true);

    // Verify code is removed
    const codes = await db.getProtocolMedicalCodes(1);
    const removedCode = codes.find((c) => c.id === assignmentId);
    expect(removedCode).toBeUndefined();
  });

  it('should handle removal of verified codes', async () => {
    // Create test medical code
    const codeId = await db.createMedicalCode({
      codeType: 'CPT',
      code: '99213',
      description: 'Office visit, established patient',
      codeSystem: 'CPT',
      codeVersion: '2024',
    });

    // Create verified code assignment
    const assignmentId = await db.assignMedicalCodeToProtocol({
      protocolDeliveryId: 2,
      medicalCodeId: codeId,
      codeType: 'CPT',
      assignmentMethod: 'verified',
      verifiedBy: 1,
    });

    // Should still be able to remove verified codes
    const result = await db.removeCodeAssignment(assignmentId);
    expect(result).toBe(true);
  });

  it('should handle removal of manually assigned codes', async () => {
    // Create test medical code
    const codeId = await db.createMedicalCode({
      codeType: 'SNOMED',
      code: '38341003',
      description: 'Hypertensive disorder',
      codeSystem: 'SNOMED CT',
      codeVersion: '2024',
    });

    // Create manually assigned code
    const assignmentId = await db.assignMedicalCodeToProtocol({
      protocolDeliveryId: 3,
      medicalCodeId: codeId,
      codeType: 'SNOMED',
      assignmentMethod: 'manual',
    });

    // Remove manual code
    const result = await db.removeCodeAssignment(assignmentId);
    expect(result).toBe(true);
  });
});
