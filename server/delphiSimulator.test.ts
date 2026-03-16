import { describe, it, expect, beforeAll } from 'vitest';
import * as db from './db';

describe('Delphi Simulator Database Helpers', () => {
  let testSessionId: number;
  let testPatientId: number;
  let testPhysicianId: number;
  let testScenarioId: number;

  beforeAll(async () => {
    // Create test physician (user) first
    const testUser = {
      openId: `test-physician-delphi-${Date.now()}`,
      name: 'Dr. Test Physician',
      email: `test-delphi-${Date.now()}@example.com`,
    };
    await db.upsertUser(testUser);
    const users = await db.getUserByOpenId(testUser.openId);
    testPhysicianId = users!.id;

    // Create test patient
    testPatientId = await db.createPatient({
      mrn: `TEST-MRN-DELPHI-${Date.now()}`,
      firstName: 'Test',
      lastName: 'Patient',
      dateOfBirth: new Date('1980-01-01'),
      gender: 'male',
      status: 'active',
      assignedPhysicianId: testPhysicianId,
    });

    // Create test clinical session
    const sessionResult = await db.createClinicalSession({
      patientId: testPatientId,
      physicianId: testPhysicianId,
      sessionDate: new Date(),
      chiefComplaint: 'Chest pain',
      sessionType: 'initial_consultation',
      status: 'in_progress',
    });
    testSessionId = sessionResult as number;
  });

  it('should create a simulation scenario', async () => {
    testScenarioId = await db.createSimulationScenario({
      sessionId: testSessionId,
      physicianId: testPhysicianId,
      patientId: testPatientId,
      scenarioName: 'Medication Management',
      diagnosisCode: 'I10',
      treatmentCode: 'CPT-99213',
      treatmentDescription: 'Lisinopril 10mg daily for hypertension',
      patientAge: 44,
      patientGender: 'male',
      comorbidities: ['diabetes', 'obesity'],
      currentMedications: ['metformin'],
      allergies: ['penicillin'],
      timeHorizon: 30,
      simulationGoal: 'Evaluate blood pressure control',
      status: 'draft',
    });

    expect(testScenarioId).toBeGreaterThan(0);
  });

  it('should retrieve scenarios by session', async () => {
    const scenarios = await db.getScenariosBySession(testSessionId);
    expect(scenarios).toBeDefined();
    expect(scenarios.length).toBeGreaterThan(0);
    expect(scenarios[0].scenarioName).toBe('Medication Management');
  });

  it('should retrieve a single scenario by ID', async () => {
    const scenario = await db.getScenarioById(testScenarioId);
    expect(scenario).toBeDefined();
    expect(scenario?.id).toBe(testScenarioId);
    expect(scenario?.treatmentDescription).toBe('Lisinopril 10mg daily for hypertension');
  });

  it('should update scenario status', async () => {
    await db.updateScenarioStatus(testScenarioId, 'running');
    const scenario = await db.getScenarioById(testScenarioId);
    expect(scenario?.status).toBe('running');
  });

  it('should add scenario interactions', async () => {
    const interactionId1 = await db.addScenarioInteraction({
      scenarioId: testScenarioId,
      role: 'physician',
      message: 'How are you feeling today?',
      dayInSimulation: 1,
      interactionType: 'question',
    });

    const interactionId2 = await db.addScenarioInteraction({
      scenarioId: testScenarioId,
      role: 'patient',
      message: 'I feel a bit dizzy in the mornings.',
      dayInSimulation: 1,
      interactionType: 'response',
    });

    expect(interactionId1).toBeGreaterThan(0);
    expect(interactionId2).toBeGreaterThan(0);
  });

  it('should retrieve scenario interactions', async () => {
    const interactions = await db.getScenarioInteractions(testScenarioId);
    expect(interactions).toBeDefined();
    expect(interactions.length).toBe(2);
    expect(interactions[0].role).toBe('physician');
    expect(interactions[1].role).toBe('patient');
  });

  it('should add scenario outcomes', async () => {
    const outcomeId1 = await db.addScenarioOutcome({
      scenarioId: testScenarioId,
      outcomeType: 'symptom_improvement',
      probability: '75.5',
      severity: 'mild',
      expectedDay: 7,
      duration: 14,
      evidenceSource: 'Clinical trial data',
      confidenceScore: '85.0',
      description: 'Blood pressure reduction expected',
    });

    const outcomeId2 = await db.addScenarioOutcome({
      scenarioId: testScenarioId,
      outcomeType: 'adverse_event',
      probability: '10.0',
      severity: 'moderate',
      expectedDay: 3,
      duration: 7,
      evidenceSource: 'FDA adverse event database',
      confidenceScore: '70.0',
      description: 'Possible dizziness or fatigue',
    });

    expect(outcomeId1).toBeGreaterThan(0);
    expect(outcomeId2).toBeGreaterThan(0);
  });

  it('should retrieve scenario outcomes ordered by probability', async () => {
    const outcomes = await db.getScenarioOutcomes(testScenarioId);
    expect(outcomes).toBeDefined();
    expect(outcomes.length).toBe(2);
    // Should be ordered by probability descending
    expect(parseFloat(outcomes[0].probability)).toBeGreaterThan(parseFloat(outcomes[1].probability));
    expect(outcomes[0].outcomeType).toBe('symptom_improvement');
  });

  it('should create a scenario comparison', async () => {
    // Create another scenario for comparison
    const scenario2Id = await db.createSimulationScenario({
      sessionId: testSessionId,
      physicianId: testPhysicianId,
      patientId: testPatientId,
      scenarioName: 'Lifestyle Intervention',
      diagnosisCode: 'I10',
      treatmentCode: 'LIFESTYLE-001',
      treatmentDescription: 'DASH diet and exercise program',
      patientAge: 44,
      patientGender: 'male',
      timeHorizon: 90,
      simulationGoal: 'Reduce blood pressure naturally',
      status: 'draft',
    });

    const comparisonId = await db.createScenarioComparison({
      sessionId: testSessionId,
      physicianId: testPhysicianId,
      scenarioIds: [testScenarioId, scenario2Id],
      ranking: [
        { scenarioId: testScenarioId, score: 85, reasoning: 'Faster results, evidence-based' },
        { scenarioId: scenario2Id, score: 75, reasoning: 'Longer timeline, requires patient compliance' },
      ],
    });

    expect(comparisonId).toBeGreaterThan(0);
  });

  it('should retrieve scenario comparisons', async () => {
    const comparisons = await db.getScenarioComparisons(testSessionId);
    expect(comparisons).toBeDefined();
    expect(comparisons.length).toBeGreaterThan(0);
    expect(comparisons[0].scenarioIds).toBeDefined();
    expect(Array.isArray(comparisons[0].scenarioIds)).toBe(true);
  });

  it('should update scenario comparison with selection', async () => {
    const comparisons = await db.getScenarioComparisons(testSessionId);
    const comparisonId = comparisons[0].id;

    await db.updateScenarioComparison(comparisonId, {
      selectedScenarioId: testScenarioId,
      physicianNotes: 'Selected based on faster onset and patient preference',
    });

    const updatedComparisons = await db.getScenarioComparisons(testSessionId);
    expect(updatedComparisons[0].selectedScenarioId).toBe(testScenarioId);
    expect(updatedComparisons[0].physicianNotes).toContain('patient preference');
  });

  it('should mark scenario as completed', async () => {
    await db.updateScenarioStatus(testScenarioId, 'completed');
    const scenario = await db.getScenarioById(testScenarioId);
    expect(scenario?.status).toBe('completed');
    expect(scenario?.completedAt).toBeDefined();
  });
});
