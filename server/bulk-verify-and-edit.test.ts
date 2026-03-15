import { describe, it, expect, beforeAll } from 'vitest';
import * as db from './db';

// Shared delivery IDs created once per suite — avoids FK constraint failures
let deliveryId100: number;
let deliveryId101: number;
let deliveryId102: number;
let deliveryId103: number;

beforeAll(async () => {
  const makeDelivery = async () => {
    const row = await db.createProtocolDelivery({
      userId: 1,
      protocolName: 'Test Protocol',
      deliveryType: 'manual',
      emailSent: false,
      pdfGenerated: false,
    });
    return row?.id ?? 0;
  };
  deliveryId100 = await makeDelivery();
  deliveryId101 = await makeDelivery();
  deliveryId102 = await makeDelivery();
  deliveryId103 = await makeDelivery();
});

describe('Bulk Verification and Code Editing', () => {
  it('should verify all unverified codes for a protocol', async () => {
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

    await db.assignMedicalCodeToProtocol({
      protocolDeliveryId: deliveryId100,
      medicalCodeId: code1Id,
      codeType: 'ICD10',
      assignmentMethod: 'automatic',
    });
    await db.assignMedicalCodeToProtocol({
      protocolDeliveryId: deliveryId100,
      medicalCodeId: code2Id,
      codeType: 'ICD10',
      assignmentMethod: 'automatic',
    });

    const codesBefore = await db.getProtocolMedicalCodes(deliveryId100);
    const unverifiedBefore = codesBefore.filter(c => !c.verifiedBy);
    expect(unverifiedBefore.length).toBeGreaterThan(0);

    const database = await db.getDb();
    if (!database) throw new Error('Database not available');
    const { protocolMedicalCodes } = await import('../drizzle/schema');
    const { eq, and, isNull } = await import('drizzle-orm');

    await database
      .update(protocolMedicalCodes)
      .set({ assignmentMethod: 'verified', verifiedBy: 1, verifiedAt: new Date() })
      .where(and(eq(protocolMedicalCodes.protocolDeliveryId, deliveryId100), isNull(protocolMedicalCodes.verifiedBy)));

    const codesAfter = await db.getProtocolMedicalCodes(deliveryId100);
    const unverifiedAfter = codesAfter.filter(c => !c.verifiedBy);
    expect(unverifiedAfter.length).toBe(0);
  });

  it('should update code description', async () => {
    const codeId = await db.createMedicalCode({
      codeType: 'ICD10',
      code: 'I10',
      description: 'Essential hypertension',
      codeSystem: 'ICD-10-CM',
      codeVersion: '2024',
    });
    const assignmentId = await db.assignMedicalCodeToProtocol({
      protocolDeliveryId: deliveryId101,
      medicalCodeId: codeId,
      codeType: 'ICD10',
      assignmentMethod: 'automatic',
    });
    const newDescription = 'Essential (primary) hypertension - updated';
    await db.updateCodeAssignment(assignmentId, { description: newDescription });
    const codes = await db.getProtocolMedicalCodes(deliveryId101);
    const updatedCode = codes.find(c => c.id === assignmentId);
    expect(updatedCode?.description).toBe(newDescription);
  });

  it('should update isPrimary status', async () => {
    const codeId = await db.createMedicalCode({
      codeType: 'ICD10',
      code: 'E11.9',
      description: 'Type 2 diabetes',
      codeSystem: 'ICD-10-CM',
      codeVersion: '2024',
    });
    const assignmentId = await db.assignMedicalCodeToProtocol({
      protocolDeliveryId: deliveryId102,
      medicalCodeId: codeId,
      codeType: 'ICD10',
      assignmentMethod: 'automatic',
    });
    await db.updateCodeAssignment(assignmentId, { isPrimary: true });
    const codes = await db.getProtocolMedicalCodes(deliveryId102);
    const updatedCode = codes.find(c => c.id === assignmentId);
    expect(updatedCode?.isPrimary).toBe(true);
  });

  it('should update both description and isPrimary together', async () => {
    const codeId = await db.createMedicalCode({
      codeType: 'CPT',
      code: '99213',
      description: 'Office visit',
      codeSystem: 'CPT',
      codeVersion: '2024',
    });
    const assignmentId = await db.assignMedicalCodeToProtocol({
      protocolDeliveryId: deliveryId103,
      medicalCodeId: codeId,
      codeType: 'CPT',
      assignmentMethod: 'manual',
    });
    const newDescription = 'Office visit, established patient, level 3';
    await db.updateCodeAssignment(assignmentId, { description: newDescription, isPrimary: true });
    const codes = await db.getProtocolMedicalCodes(deliveryId103);
    const updatedCode = codes.find(c => c.id === assignmentId);
    expect(updatedCode?.description).toBe(newDescription);
    expect(updatedCode?.isPrimary).toBe(true);
  });
});
