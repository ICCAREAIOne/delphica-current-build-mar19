import { describe, it, expect } from 'vitest';
import * as db from './db';

describe('Medical Coding Batch Operations', () => {
  it('should batch verify multiple codes', async () => {
    // Create test medical codes
    const code1Id = await db.createMedicalCode({
      codeType: 'ICD10',
      code: 'I10',
      description: 'Essential hypertension',
      codeSystem: 'ICD-10-CM',
      codeVersion: '2024',
    });

    const code2Id = await db.createMedicalCode({
      codeType: 'ICD10',
      code: 'E11.9',
      description: 'Type 2 diabetes',
      codeSystem: 'ICD-10-CM',
      codeVersion: '2024',
    });

    // Create code assignments
    const assignment1Id = await db.assignMedicalCodeToProtocol({
      protocolDeliveryId: 200,
      medicalCodeId: code1Id,
      codeType: 'ICD10',
      assignmentMethod: 'automatic',
    });

    const assignment2Id = await db.assignMedicalCodeToProtocol({
      protocolDeliveryId: 200,
      medicalCodeId: code2Id,
      codeType: 'ICD10',
      assignmentMethod: 'automatic',
    });

    // Batch verify codes
    const result = await db.batchVerifyCodes([assignment1Id, assignment2Id], 1);

    expect(result.count).toBe(2);

    // Verify codes are marked as verified
    const codes = await db.getProtocolMedicalCodes(200);
    const verifiedCodes = codes.filter(c => c.verifiedBy === 1);
    expect(verifiedCodes.length).toBeGreaterThanOrEqual(2);
  });

  it('should batch remove multiple codes', async () => {
    // Create test medical code
    const codeId = await db.createMedicalCode({
      codeType: 'CPT',
      code: '99213',
      description: 'Office visit',
      codeSystem: 'CPT',
      codeVersion: '2024',
    });

    // Create code assignment
    const assignmentId = await db.assignMedicalCodeToProtocol({
      protocolDeliveryId: 200, // Reuse same protocol
      medicalCodeId: codeId,
      codeType: 'CPT',
      assignmentMethod: 'automatic',
    });

    // Get initial count
    const codesBefore = await db.getProtocolMedicalCodes(200);
    const initialCount = codesBefore.length;

    // Batch remove code
    const result = await db.batchRemoveCodes([assignmentId]);

    expect(result.count).toBe(1);

    // Verify code is removed
    const codesAfter = await db.getProtocolMedicalCodes(200);
    expect(codesAfter.length).toBe(initialCount - 1);
  });

  it('should handle empty batch operations', async () => {
    const result = await db.batchVerifyCodes([], 1);
    expect(result.count).toBe(0);
  });
});
