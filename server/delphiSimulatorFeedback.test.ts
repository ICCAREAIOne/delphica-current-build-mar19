import { describe, it, expect, beforeAll } from 'vitest';
import * as db from './db';

describe('Delphi Simulator Feedback System', () => {
  let testSessionId: number;
  let testPatientId: number;
  let testPhysicianId: number;
  let testScenarioId: number;
  let testInteractionId: number;
  let testOutcomeId: number;

  beforeAll(async () => {
    // Create test physician (user) first
    const testUser = {
      openId: `test-physician-feedback-${Date.now()}`,
      name: 'Dr. Test Feedback',
      email: `test-feedback-${Date.now()}@example.com`,
    };
    await db.upsertUser(testUser);
    const users = await db.getUserByOpenId(testUser.openId);
    testPhysicianId = users!.id;

    // Create test patient
    testPatientId = await db.createPatient({
      mrn: `TEST-MRN-FEEDBACK-${Date.now()}`,
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
      chiefComplaint: 'Test feedback',
      sessionType: 'initial_consultation',
      status: 'in_progress',
    });
    testSessionId = Number((sessionResult as any)[0].insertId);

    // Create test scenario
    testScenarioId = await db.createSimulationScenario({
      sessionId: testSessionId,
      physicianId: testPhysicianId,
      patientId: testPatientId,
      scenarioName: 'Feedback Test Scenario',
      diagnosisCode: 'I10',
      treatmentCode: 'CPT-99213',
      treatmentDescription: 'Test treatment',
      patientAge: 44,
      patientGender: 'male',
      timeHorizon: 30,
      simulationGoal: 'Test feedback',
      status: 'running',
    });

    // Create test interaction
    testInteractionId = await db.addScenarioInteraction({
      scenarioId: testScenarioId,
      role: 'patient',
      message: 'I feel dizzy',
      dayInSimulation: 1,
      interactionType: 'response',
    });

    // Create test outcome
    testOutcomeId = await db.addScenarioOutcome({
      scenarioId: testScenarioId,
      outcomeType: 'symptom_improvement',
      probability: '75.0',
      severity: 'mild',
      expectedDay: 7,
      evidenceSource: 'Test source',
      confidenceScore: '85.0',
      description: 'Test outcome',
    });
  });

  describe('Interaction Feedback', () => {
    it('should submit interaction feedback', async () => {
      const feedbackId = await db.submitInteractionFeedback({
        interactionId: testInteractionId,
        scenarioId: testScenarioId,
        physicianId: testPhysicianId,
        realismScore: 4,
        clinicalAccuracy: 5,
        conversationalQuality: 4,
        comments: 'Very realistic patient response',
        issuesReported: ['minor terminology issue'],
      });

      expect(feedbackId).toBeGreaterThan(0);
    });

    it('should retrieve interaction feedback', async () => {
      const feedback = await db.getInteractionFeedback(testInteractionId);
      
      expect(feedback).toBeDefined();
      expect(feedback?.realismScore).toBe(4);
      expect(feedback?.clinicalAccuracy).toBe(5);
      expect(feedback?.conversationalQuality).toBe(4);
      expect(feedback?.comments).toBe('Very realistic patient response');
    });

    it('should retrieve all feedback for a scenario', async () => {
      const feedbacks = await db.getScenarioInteractionFeedback(testScenarioId);
      
      expect(feedbacks).toBeDefined();
      expect(feedbacks.length).toBeGreaterThan(0);
      expect(feedbacks[0].scenarioId).toBe(testScenarioId);
    });
  });

  describe('Outcome Feedback', () => {
    it('should submit outcome feedback', async () => {
      const feedbackId = await db.submitOutcomeFeedback({
        outcomeId: testOutcomeId,
        scenarioId: testScenarioId,
        physicianId: testPhysicianId,
        accuracyScore: 5,
        evidenceQuality: 4,
        clinicalRelevance: 5,
        actualOutcomeOccurred: 'yes',
        actualProbability: '80.0',
        actualSeverity: 'mild',
        comments: 'Prediction was accurate',
        suggestedImprovements: 'Could include more recent studies',
      });

      expect(feedbackId).toBeGreaterThan(0);
    });

    it('should retrieve outcome feedback', async () => {
      const feedback = await db.getOutcomeFeedback(testOutcomeId);
      
      expect(feedback).toBeDefined();
      expect(feedback?.accuracyScore).toBe(5);
      expect(feedback?.evidenceQuality).toBe(4);
      expect(feedback?.clinicalRelevance).toBe(5);
      expect(feedback?.actualOutcomeOccurred).toBe('yes');
      expect(feedback?.comments).toBe('Prediction was accurate');
    });

    it('should retrieve all outcome feedback for a scenario', async () => {
      const feedbacks = await db.getScenarioOutcomeFeedback(testScenarioId);
      
      expect(feedbacks).toBeDefined();
      expect(feedbacks.length).toBeGreaterThan(0);
      expect(feedbacks[0].scenarioId).toBe(testScenarioId);
    });
  });

  describe('Feedback Analytics', () => {
    it('should calculate feedback analytics for all physicians', async () => {
      const analytics = await db.getFeedbackAnalytics();
      
      expect(analytics).toBeDefined();
      expect(analytics.interactionStats).toBeDefined();
      expect(analytics.outcomeStats).toBeDefined();
      expect(analytics.totalFeedbackCount).toBeGreaterThan(0);
      
      expect(analytics.interactionStats.count).toBeGreaterThan(0);
      expect(analytics.interactionStats.avgRealismScore).toBeGreaterThan(0);
      expect(analytics.interactionStats.avgClinicalAccuracy).toBeGreaterThan(0);
      expect(analytics.interactionStats.avgConversationalQuality).toBeGreaterThan(0);
      
      expect(analytics.outcomeStats.count).toBeGreaterThan(0);
      expect(analytics.outcomeStats.avgAccuracyScore).toBeGreaterThan(0);
      expect(analytics.outcomeStats.avgEvidenceQuality).toBeGreaterThan(0);
      expect(analytics.outcomeStats.avgClinicalRelevance).toBeGreaterThan(0);
    });

    it('should calculate feedback analytics for specific physician', async () => {
      const analytics = await db.getFeedbackAnalytics(testPhysicianId);
      
      expect(analytics).toBeDefined();
      expect(analytics.interactionStats.count).toBeGreaterThan(0);
      expect(analytics.outcomeStats.count).toBeGreaterThan(0);
    });

    it('should show high average scores for quality feedback', async () => {
      const analytics = await db.getFeedbackAnalytics(testPhysicianId);
      
      // All our test feedback had scores of 4-5
      expect(analytics.interactionStats.avgRealismScore).toBeGreaterThanOrEqual(4);
      expect(analytics.interactionStats.avgClinicalAccuracy).toBeGreaterThanOrEqual(4);
      expect(analytics.outcomeStats.avgAccuracyScore).toBeGreaterThanOrEqual(4);
      expect(analytics.outcomeStats.avgEvidenceQuality).toBeGreaterThanOrEqual(4);
      expect(analytics.outcomeStats.avgClinicalRelevance).toBeGreaterThanOrEqual(4);
    });
  });
});
