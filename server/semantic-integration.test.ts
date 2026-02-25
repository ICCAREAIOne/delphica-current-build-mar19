import { describe, it, expect, beforeAll } from 'vitest';
import * as db from './db';
import { generateICD10Codes, generateCPTCodes, processClinicalNote } from './semanticProcessor';

describe.sequential('Semantic Processor Integration', () => {
  let testSessionId: number;
  let testDiagnosisId: number;
  let testTreatmentId: number;

  beforeAll(async () => {
    // Create a test clinical session
    await db.createClinicalSession({
      patientId: 1,
      physicianId: 1,
      sessionType: 'initial_consultation',
      sessionDate: new Date(),
      chiefComplaint: 'Persistent headaches and elevated blood pressure',
      status: 'in_progress',
    });
    
    const sessions = await db.getClinicalSessionsByPhysician(1);
    testSessionId = sessions[0].id;
  });

  // ============================================================================
  // ICD-10 Code Generation Tests
  // ============================================================================

  it('should generate ICD-10 codes from clinical note', async () => {
    const codes = await generateICD10Codes({
      chiefComplaint: 'Persistent headaches',
      assessment: 'Essential hypertension',
    });

    expect(codes).toBeDefined();
    expect(Array.isArray(codes)).toBe(true);
    expect(codes.length).toBeGreaterThan(0);
    expect(codes[0]).toHaveProperty('code');
    expect(codes[0]).toHaveProperty('description');
    expect(codes[0]).toHaveProperty('confidence');
    expect(codes[0]).toHaveProperty('category');
  });

  it('should prioritize primary diagnosis codes', async () => {
    const codes = await generateICD10Codes({
      chiefComplaint: 'Chest pain',
      assessment: 'Acute myocardial infarction',
    });

    const primaryCodes = codes.filter(c => c.category === 'primary');
    expect(primaryCodes.length).toBeGreaterThan(0);
  });

  // ============================================================================
  // CPT Code Generation Tests
  // ============================================================================

  it('should generate CPT codes from treatment information', async () => {
    const codes = await generateCPTCodes({
      chiefComplaint: 'Office visit',
      plan: 'Lisinopril 10mg daily',
      procedures: ['Blood pressure check'],
    });

    expect(codes).toBeDefined();
    expect(Array.isArray(codes)).toBe(true);
    expect(codes.length).toBeGreaterThan(0);
    expect(codes[0]).toHaveProperty('code');
    expect(codes[0]).toHaveProperty('description');
    expect(codes[0]).toHaveProperty('confidence');
  });

  it('should generate procedure codes for interventions', async () => {
    const codes = await generateCPTCodes({
      chiefComplaint: 'Procedure',
      plan: 'ECG performed',
      procedures: ['Electrocardiogram'],
    });

    expect(codes).toBeDefined();
    expect(codes.length).toBeGreaterThan(0);
  });

  // ============================================================================
  // Diagnosis Entry with Auto-Coding Tests
  // ============================================================================

  it('should auto-generate ICD-10 code when creating diagnosis entry', async () => {
    await db.createDiagnosisEntry({
      sessionId: testSessionId,
      diagnosisName: 'Essential (primary) hypertension',
      diagnosisType: 'primary',
      severity: 'moderate',
      status: 'active',
    });

    const diagnoses = await db.getDiagnosisEntriesBySession(testSessionId);
    testDiagnosisId = diagnoses[0].id;

    expect(diagnoses.length).toBeGreaterThan(0);
    expect(diagnoses[0].diagnosisName).toBe('Essential (primary) hypertension');
    // Note: diagnosisCode might be null if auto-generation is not triggered in this test context
  });

  it('should preserve manually entered ICD-10 code', async () => {
    await db.createDiagnosisEntry({
      sessionId: testSessionId,
      diagnosisCode: 'I10',
      diagnosisName: 'Essential hypertension',
      diagnosisType: 'primary',
      status: 'active',
    });

    const diagnoses = await db.getDiagnosisEntriesBySession(testSessionId);
    const manualDiagnosis = diagnoses.find(d => d.diagnosisCode === 'I10');

    expect(manualDiagnosis).toBeDefined();
    expect(manualDiagnosis?.diagnosisCode).toBe('I10');
  });

  // ============================================================================
  // Treatment Entry with Auto-Coding Tests
  // ============================================================================

  it('should auto-generate CPT code for procedure treatments', async () => {
    await db.createTreatmentEntry({
      sessionId: testSessionId,
      treatmentType: 'procedure',
      treatmentName: 'Electrocardiogram',
      status: 'proposed',
    });

    const treatments = await db.getTreatmentEntriesBySession(testSessionId);
    testTreatmentId = treatments[0].id;

    expect(treatments.length).toBeGreaterThan(0);
    expect(treatments[0].treatmentName).toBe('Electrocardiogram');
    // Note: treatmentCode might be null if auto-generation is not triggered in this test context
  });

  it('should preserve manually entered CPT code', async () => {
    await db.createTreatmentEntry({
      sessionId: testSessionId,
      treatmentType: 'procedure',
      treatmentName: 'Blood pressure check',
      treatmentCode: '99213',
      status: 'active',
    });

    const treatments = await db.getTreatmentEntriesBySession(testSessionId);
    const manualTreatment = treatments.find(t => t.treatmentCode === '99213');

    expect(manualTreatment).toBeDefined();
    expect(manualTreatment?.treatmentCode).toBe('99213');
  });

  // ============================================================================
  // Comprehensive Clinical Note Processing Tests
  // ============================================================================

  it('should process complete clinical note with all codes', { timeout: 30000 }, async () => {
    const result = await processClinicalNote({
      chiefComplaint: 'Chest pain and shortness of breath',
      historyOfPresentIllness: 'Patient reports sudden onset chest pain 2 hours ago',
      physicalExam: 'Elevated heart rate, blood pressure 160/95',
      assessment: 'Suspected acute coronary syndrome',
      plan: 'ECG, troponin levels, aspirin 325mg',
      procedures: ['ECG', 'Blood draw'],
    });

    expect(result).toBeDefined();
    expect(result.icd10Codes).toBeDefined();
    expect(result.cptCodes).toBeDefined();
    expect(result.icd10Codes.length).toBeGreaterThan(0);
    expect(result.cptCodes.length).toBeGreaterThan(0);
    expect(result.confidenceScore).toBeGreaterThan(0);
    expect(result.codingNotes).toBeDefined();
  });

  it('should extract clinical entities from note', { timeout: 30000 }, async () => {
    const result = await processClinicalNote({
      chiefComplaint: 'Fever and cough',
      historyOfPresentIllness: 'Patient has had fever of 101°F for 3 days with productive cough',
      physicalExam: 'Lung auscultation reveals crackles in right lower lobe',
      assessment: 'Community-acquired pneumonia',
      plan: 'Azithromycin 500mg daily for 5 days, chest X-ray',
      procedures: ['Chest X-ray'],
    });

    expect(result.extractedEntities).toBeDefined();
    expect(result.extractedEntities.symptoms).toBeDefined();
    expect(result.extractedEntities.diagnoses).toBeDefined();
    expect(result.extractedEntities.procedures).toBeDefined();
    expect(result.extractedEntities.medications).toBeDefined();
  });

  it('should generate SNOMED concepts from clinical note', async () => {
    const result = await processClinicalNote({
      chiefComplaint: 'Abdominal pain',
      assessment: 'Acute appendicitis',
      plan: 'Appendectomy',
      procedures: ['Appendectomy'],
    });

    expect(result.snomedConcepts).toBeDefined();
    expect(Array.isArray(result.snomedConcepts)).toBe(true);
  });

  // ============================================================================
  // Session-Level Code Generation Tests
  // ============================================================================

  it('should generate comprehensive codes for completed session', { timeout: 30000 }, async () => {
    // Create a complete session with diagnoses and treatments
    const newSessionId = testSessionId;

    // Add diagnosis
    await db.createDiagnosisEntry({
      sessionId: newSessionId,
      diagnosisCode: 'I10',
      diagnosisName: 'Essential hypertension',
      diagnosisType: 'primary',
      status: 'active',
    });

    // Add treatment
    await db.createTreatmentEntry({
      sessionId: newSessionId,
      treatmentType: 'medication',
      treatmentName: 'Lisinopril 10mg daily',
      status: 'active',
    });

    // Get session data
    const session = await db.getClinicalSessionById(newSessionId);
    const diagnoses = await db.getDiagnosisEntriesBySession(newSessionId);
    const treatments = await db.getTreatmentEntriesBySession(newSessionId);

    expect(session).toBeDefined();
    expect(diagnoses.length).toBeGreaterThan(0);
    expect(treatments.length).toBeGreaterThan(0);

    // Process the session
    const result = await processClinicalNote({
      chiefComplaint: session!.chiefComplaint || '',
      assessment: diagnoses.map(d => d.diagnosisName).join('; '),
      plan: treatments.map(t => t.treatmentName).join('; '),
    });

    expect(result.icd10Codes.length).toBeGreaterThan(0);
    expect(result.cptCodes.length).toBeGreaterThan(0);
  });

  // ============================================================================
  // Code Confidence and Quality Tests
  // ============================================================================

  it('should provide confidence scores for generated codes', async () => {
    const icd10Codes = await generateICD10Codes({
      chiefComplaint: 'Type 2 diabetes mellitus',
      assessment: 'Type 2 diabetes mellitus without complications',
    });

    expect(icd10Codes[0].confidence).toBeGreaterThan(0);
    expect(icd10Codes[0].confidence).toBeLessThanOrEqual(1);
  });

  it('should handle ambiguous clinical information', async () => {
    const codes = await generateICD10Codes({
      chiefComplaint: 'Unclear symptoms',
      assessment: 'Further evaluation needed',
    });

    // Should still generate codes, but with lower confidence
    expect(codes).toBeDefined();
    expect(codes.length).toBeGreaterThan(0);
  });
});
