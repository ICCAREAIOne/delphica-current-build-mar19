import { describe, it, expect } from 'vitest';
import * as db from './db';

describe('Bulk Verification and Code Editing', () => {
  it('should verify all unverified codes for a protocol', async () => {
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
      description: 'Type 2 diabetes without complications',
      codeSystem: 'ICD-10-CM',
      codeVersion: '2024',
    });

    // Create unverified code assignments
    await db.assignMedicalCodeToProtocol({
      protocolDeliveryId: 100,
      medicalCodeId: code1Id,
      codeType: 'ICD10',
      assignmentMethod: 'automatic',
    });

    await db.assignMedicalCodeToProtocol({
      protocolDeliveryId: 100,
      medicalCodeId: code2Id,
      codeType: 'ICD10',
      assignmentMethod: 'automatic',
    });

    // Get codes before verification
    const codesBefore = await db.getProtocolMedicalCodes(100);
    const unverifiedBefore = codesBefore.filter(c => !c.verifiedBy);
    expect(unverifiedBefore.length).toBeGreaterThan(0);

    // Verify all codes (simulating the endpoint logic)
    const database = await db.getDb();
    if (!database) throw new Error('Database not available');

    const { protocolMedicalCodes } = await import('../drizzle/schema');
    const { eq, and, isNull } = await import('drizzle-orm');

    await database
      .update(protocolMedicalCodes)
      .set({
        assignmentMethod: 'verified',
        verifiedBy: 1,
        verifiedAt: new Date(),
      })
      .where(
        and(
          eq(protocolMedicalCodes.protocolDeliveryId, 100),
          isNull(protocolMedicalCodes.verifiedBy)
        )
      );

    // Get codes after verification
    const codesAfter = await db.getProtocolMedicalCodes(100);
    const unverifiedAfter = codesAfter.filter(c => !c.verifiedBy);
    expect(unverifiedAfter.length).toBe(0);
  });

  it('should update code description', async () => {
    // Create test medical code
    const codeId = await db.createMedicalCode({
      codeType: 'ICD10',
      code: 'I10',
      description: 'Essential hypertension',
      codeSystem: 'ICD-10-CM',
      codeVersion: '2024',
    });

    // Create code assignment
    const assignmentId = await db.assignMedicalCodeToProtocol({
      protocolDeliveryId: 101,
      medicalCodeId: codeId,
      codeType: 'ICD10',
      assignmentMethod: 'automatic',
    });

    // Update description
    const newDescription = 'Essential (primary) hypertension - updated';
    await db.updateCodeAssignment(assignmentId, {
      description: newDescription,
    });

    // Verify update
    const codes = await db.getProtocolMedicalCodes(101);
    const updatedCode = codes.find(c => c.id === assignmentId);
    expect(updatedCode?.description).toBe(newDescription);
  });

  it('should update isPrimary status', async () => {
    // Create test medical code
    const codeId = await db.createMedicalCode({
      codeType: 'ICD10',
      code: 'E11.9',
      description: 'Type 2 diabetes',
      codeSystem: 'ICD-10-CM',
      codeVersion: '2024',
    });

    // Create code assignment
    const assignmentId = await db.assignMedicalCodeToProtocol({
      protocolDeliveryId: 102,
      medicalCodeId: codeId,
      codeType: 'ICD10',
      assignmentMethod: 'automatic',
    });

    // Update isPrimary to true
    await db.updateCodeAssignment(assignmentId, {
      isPrimary: true,
    });

    // Verify update
    const codes = await db.getProtocolMedicalCodes(102);
    const updatedCode = codes.find(c => c.id === assignmentId);
    expect(updatedCode?.isPrimary).toBe(true);
  });

  it('should update both description and isPrimary together', async () => {
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
      protocolDeliveryId: 103,
      medicalCodeId: codeId,
      codeType: 'CPT',
      assignmentMethod: 'manual',
    });

    // Update both fields
    const newDescription = 'Office visit, established patient, level 3';
    await db.updateCodeAssignment(assignmentId, {
      description: newDescription,
      isPrimary: true,
    });

    // Verify updates
    const codes = await db.getProtocolMedicalCodes(103);
    const updatedCode = codes.find(c => c.id === assignmentId);
    expect(updatedCode?.description).toBe(newDescription);
    expect(updatedCode?.isPrimary).toBe(true);
  });
});
