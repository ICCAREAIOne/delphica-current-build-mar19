import { describe, it, expect, beforeAll } from 'vitest';
import * as db from './db';

describe.sequential('DAO Protocol Interface', () => {
  let testPatientId: number;
  let testPhysicianId: number;
  let testSessionId: number;
  let testDiagnosisId: number;
  let testTreatmentId: number;

  beforeAll(async () => {
    // Use existing test user as physician
    testPhysicianId = 1; // Assuming user with ID 1 exists
    
    // Use existing test patient
    testPatientId = 1; // Assuming patient with ID 1 exists
  });

  // ============================================================================
  // Clinical Sessions Tests
  // ============================================================================

  it('should create a clinical session', async () => {
    await db.createClinicalSession({
      patientId: testPatientId,
      physicianId: testPhysicianId,
      sessionType: 'initial_consultation',
      sessionDate: new Date(),
      chiefComplaint: 'Persistent headaches',
      status: 'in_progress',
    });
    
    // Query back the created session
    const sessions = await db.getClinicalSessionsByPhysician(testPhysicianId);
    expect(sessions.length).toBeGreaterThan(0);
    testSessionId = sessions[0].id;
    expect(testSessionId).toBeGreaterThan(0);
  });

  it('should retrieve clinical session by ID', async () => {
    expect(testSessionId).toBeGreaterThan(0);
    const session = await db.getClinicalSessionById(testSessionId);

    expect(session).toBeDefined();
    expect(session?.patientId).toBe(testPatientId);
    expect(session?.physicianId).toBe(testPhysicianId);
    expect(session?.sessionType).toBe('initial_consultation');
    expect(session?.chiefComplaint).toBe('Persistent headaches');
  });

  it('should retrieve sessions by patient', async () => {
    const sessions = await db.getClinicalSessionsByPatient(testPatientId);

    expect(sessions).toBeDefined();
    expect(Array.isArray(sessions)).toBe(true);
    expect(sessions.length).toBeGreaterThan(0);
    expect(sessions[0].patientId).toBe(testPatientId);
  });

  it('should retrieve sessions by physician', async () => {
    const sessions = await db.getClinicalSessionsByPhysician(testPhysicianId);

    expect(sessions).toBeDefined();
    expect(Array.isArray(sessions)).toBe(true);
    expect(sessions.length).toBeGreaterThan(0);
    expect(sessions[0].physicianId).toBe(testPhysicianId);
  });

  it('should update clinical session', async () => {
    expect(testSessionId).toBeGreaterThan(0);
    await db.updateClinicalSession(testSessionId, {
      historyOfPresentIllness: 'Patient reports severe headaches for the past 2 weeks',
      physicalExamFindings: 'Blood pressure elevated at 145/95',
    });

    const session = await db.getClinicalSessionById(testSessionId);
    expect(session?.historyOfPresentIllness).toBe('Patient reports severe headaches for the past 2 weeks');
    expect(session?.physicalExamFindings).toBe('Blood pressure elevated at 145/95');
  });

  // ============================================================================
  // Diagnosis Entries Tests
  // ============================================================================

  it('should create a diagnosis entry', async () => {
    expect(testSessionId).toBeGreaterThan(0);
    await db.createDiagnosisEntry({
      sessionId: testSessionId,
      diagnosisCode: 'I10',
      diagnosisName: 'Essential (primary) hypertension',
      diagnosisType: 'primary',
      severity: 'moderate',
      onset: '2 weeks ago',
      duration: 'Ongoing',
      symptoms: ['headache', 'dizziness', 'fatigue'],
      clinicalNotes: 'Patient has family history of hypertension',
      confidence: 'high',
      status: 'active',
    });
    
    // Query back the created diagnosis
    const diagnoses = await db.getDiagnosisEntriesBySession(testSessionId);
    expect(diagnoses.length).toBeGreaterThan(0);
    testDiagnosisId = diagnoses[0].id;
    expect(testDiagnosisId).toBeGreaterThan(0);
  });

  it('should retrieve diagnosis entry by ID', async () => {
    expect(testDiagnosisId).toBeGreaterThan(0);
    const diagnosis = await db.getDiagnosisEntryById(testDiagnosisId);

    expect(diagnosis).toBeDefined();
    expect(diagnosis?.diagnosisCode).toBe('I10');
    expect(diagnosis?.diagnosisName).toBe('Essential (primary) hypertension');
    expect(diagnosis?.diagnosisType).toBe('primary');
    expect(diagnosis?.severity).toBe('moderate');
  });

  it('should retrieve diagnoses by session', async () => {
    expect(testSessionId).toBeGreaterThan(0);
    const diagnoses = await db.getDiagnosisEntriesBySession(testSessionId);

    expect(diagnoses).toBeDefined();
    expect(Array.isArray(diagnoses)).toBe(true);
    expect(diagnoses.length).toBeGreaterThan(0);
    expect(diagnoses[0].sessionId).toBe(testSessionId);
  });

  it('should update diagnosis entry', async () => {
    expect(testDiagnosisId).toBeGreaterThan(0);
    await db.updateDiagnosisEntry(testDiagnosisId, {
      severity: 'severe',
      clinicalNotes: 'Blood pressure readings consistently high',
    });

    const diagnosis = await db.getDiagnosisEntryById(testDiagnosisId);
    expect(diagnosis?.severity).toBe('severe');
    expect(diagnosis?.clinicalNotes).toBe('Blood pressure readings consistently high');
  });

  // ============================================================================
  // Treatment Entries Tests
  // ============================================================================

  it('should create a treatment entry', async () => {
    expect(testSessionId).toBeGreaterThan(0);
    await db.createTreatmentEntry({
      sessionId: testSessionId,
      diagnosisId: testDiagnosisId,
      treatmentType: 'medication',
      treatmentName: 'Lisinopril',
      treatmentCode: 'C09AA03',
      dosage: '10mg',
      frequency: 'Once daily',
      route: 'Oral',
      duration: '30 days',
      instructions: 'Take in the morning with food',
      rationale: 'First-line treatment for hypertension',
      expectedOutcome: 'Reduce blood pressure to normal range',
      sideEffects: ['dry cough', 'dizziness'],
      contraindications: ['pregnancy', 'angioedema'],
      monitoringParameters: 'Monitor blood pressure weekly',
      status: 'proposed',
    });
    
    // Query back the created treatment
    const treatments = await db.getTreatmentEntriesBySession(testSessionId);
    expect(treatments.length).toBeGreaterThan(0);
    testTreatmentId = treatments[0].id;
    expect(testTreatmentId).toBeGreaterThan(0);
  });

  it('should retrieve treatment entry by ID', async () => {
    expect(testTreatmentId).toBeGreaterThan(0);
    const treatment = await db.getTreatmentEntryById(testTreatmentId);

    expect(treatment).toBeDefined();
    expect(treatment?.treatmentName).toBe('Lisinopril');
    expect(treatment?.treatmentType).toBe('medication');
    expect(treatment?.dosage).toBe('10mg');
    expect(treatment?.frequency).toBe('Once daily');
  });

  it('should retrieve treatments by session', async () => {
    expect(testSessionId).toBeGreaterThan(0);
    const treatments = await db.getTreatmentEntriesBySession(testSessionId);

    expect(treatments).toBeDefined();
    expect(Array.isArray(treatments)).toBe(true);
    expect(treatments.length).toBeGreaterThan(0);
    expect(treatments[0].sessionId).toBe(testSessionId);
  });

  it('should retrieve treatments by diagnosis', async () => {
    expect(testDiagnosisId).toBeGreaterThan(0);
    const treatments = await db.getTreatmentEntriesByDiagnosis(testDiagnosisId);

    expect(treatments).toBeDefined();
    expect(Array.isArray(treatments)).toBe(true);
    expect(treatments.length).toBeGreaterThan(0);
    expect(treatments[0].diagnosisId).toBe(testDiagnosisId);
  });

  it('should update treatment entry', async () => {
    expect(testTreatmentId).toBeGreaterThan(0);
    await db.updateTreatmentEntry(testTreatmentId, {
      status: 'active',
      startDate: new Date(),
    });

    const treatment = await db.getTreatmentEntryById(testTreatmentId);
    expect(treatment?.status).toBe('active');
    expect(treatment?.startDate).toBeDefined();
  });

  // ============================================================================
  // Clinical Observations Tests
  // ============================================================================

  it('should create a clinical observation', async () => {
    expect(testSessionId).toBeGreaterThan(0);
    await db.createClinicalObservation({
      sessionId: testSessionId,
      observationType: 'Blood Pressure',
      observationValue: '145/95',
      unit: 'mmHg',
      notes: 'Measured after 5 minutes of rest',
      isAbnormal: true,
    });
    
    // Query back the created observation
    const observations = await db.getClinicalObservationsBySession(testSessionId);
    expect(observations.length).toBeGreaterThan(0);
  });

  it('should retrieve observations by session', async () => {
    expect(testSessionId).toBeGreaterThan(0);
    const observations = await db.getClinicalObservationsBySession(testSessionId);

    expect(observations).toBeDefined();
    expect(Array.isArray(observations)).toBe(true);
    expect(observations.length).toBeGreaterThan(0);
    expect(observations[0].sessionId).toBe(testSessionId);
    expect(observations[0].observationType).toBe('Blood Pressure');
    expect(observations[0].observationValue).toBe('145/95');
  });

  // ============================================================================
  // Session Completion Tests
  // ============================================================================

  it('should complete a clinical session', async () => {
    expect(testSessionId).toBeGreaterThan(0);
    await db.completeClinicalSession(testSessionId);

    const session = await db.getClinicalSessionById(testSessionId);
    expect(session?.status).toBe('completed');
    expect(session?.completedAt).toBeDefined();
  });

  // ============================================================================
  // Cleanup Tests
  // ============================================================================

  it('should delete a treatment entry', async () => {
    expect(testTreatmentId).toBeGreaterThan(0);
    await db.deleteTreatmentEntry(testTreatmentId);

    const treatment = await db.getTreatmentEntryById(testTreatmentId);
    expect(treatment).toBeNull();
  });

  it('should delete a diagnosis entry', async () => {
    expect(testDiagnosisId).toBeGreaterThan(0);
    await db.deleteDiagnosisEntry(testDiagnosisId);

    const diagnosis = await db.getDiagnosisEntryById(testDiagnosisId);
    expect(diagnosis).toBeNull();
  });
});
