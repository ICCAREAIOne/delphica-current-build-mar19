import { describe, it, expect, beforeAll } from 'vitest';
import * as db from './db';

describe('Peer Comparison Analytics', () => {
  let testPhysician1Id: number;
  let testPhysician2Id: number;
  let testPhysician3Id: number;
  let testPatientId: number;
  let testSessionId: number;
  let testScenario1Id: number;
  let testScenario2Id: number;
  let testInteraction1Id: number;
  let testInteraction2Id: number;
  let testOutcome1Id: number;
  let testOutcome2Id: number;

  beforeAll(async () => {
    // Create three test physicians
    const physician1 = {
      openId: `test-physician1-peer-${Date.now()}`,
      name: 'Dr. Test One',
      email: `test1-peer-${Date.now()}@example.com`,
    };
    await db.upsertUser(physician1);
    const user1 = await db.getUserByOpenId(physician1.openId);
    testPhysician1Id = user1!.id;

    const physician2 = {
      openId: `test-physician2-peer-${Date.now()}`,
      name: 'Dr. Test Two',
      email: `test2-peer-${Date.now()}@example.com`,
    };
    await db.upsertUser(physician2);
    const user2 = await db.getUserByOpenId(physician2.openId);
    testPhysician2Id = user2!.id;

    const physician3 = {
      openId: `test-physician3-peer-${Date.now()}`,
      name: 'Dr. Test Three',
      email: `test3-peer-${Date.now()}@example.com`,
    };
    await db.upsertUser(physician3);
    const user3 = await db.getUserByOpenId(physician3.openId);
    testPhysician3Id = user3!.id;

    // Create test patient
    testPatientId = await db.createPatient({
      mrn: `TEST-MRN-PEER-${Date.now()}`,
      firstName: 'Test',
      lastName: 'Patient',
      dateOfBirth: new Date('1980-01-01'),
      gender: 'male',
      status: 'active',
      assignedPhysicianId: testPhysician1Id,
    });

    // Create test clinical session
    const sessionResult = await db.createClinicalSession({
      patientId: testPatientId,
      physicianId: testPhysician1Id,
      sessionDate: new Date(),
      chiefComplaint: 'Test peer comparison',
      sessionType: 'initial_consultation',
      status: 'in_progress',
    });
    testSessionId = sessionResult as number;

    // Create test scenarios
    testScenario1Id = await db.createSimulationScenario({
      sessionId: testSessionId,
      physicianId: testPhysician1Id,
      patientId: testPatientId,
      scenarioName: 'Peer Test Scenario 1',
      diagnosisCode: 'I10',
      treatmentCode: 'CPT-99213',
      treatmentDescription: 'Test treatment 1',
      patientAge: 44,
      patientGender: 'male',
      timeHorizon: 30,
      simulationGoal: 'Test peer comparison',
      status: 'running',
    });

    testScenario2Id = await db.createSimulationScenario({
      sessionId: testSessionId,
      physicianId: testPhysician2Id,
      patientId: testPatientId,
      scenarioName: 'Peer Test Scenario 2',
      diagnosisCode: 'I10',
      treatmentCode: 'CPT-99214',
      treatmentDescription: 'Test treatment 2',
      patientAge: 44,
      patientGender: 'male',
      timeHorizon: 30,
      simulationGoal: 'Test peer comparison',
      status: 'running',
    });

    // Create test interactions
    testInteraction1Id = await db.addScenarioInteraction({
      scenarioId: testScenario1Id,
      role: 'patient',
      message: 'I feel dizzy',
      dayInSimulation: 1,
      interactionType: 'response',
    });

    testInteraction2Id = await db.addScenarioInteraction({
      scenarioId: testScenario2Id,
      role: 'patient',
      message: 'I have chest pain',
      dayInSimulation: 1,
      interactionType: 'response',
    });

    // Create test outcomes
    testOutcome1Id = await db.addScenarioOutcome({
      scenarioId: testScenario1Id,
      outcomeType: 'symptom_improvement',
      probability: '75.0',
      severity: 'mild',
      expectedDay: 7,
      evidenceSource: 'Test source 1',
      confidenceScore: '85.0',
      description: 'Test outcome 1',
    });

    testOutcome2Id = await db.addScenarioOutcome({
      scenarioId: testScenario2Id,
      outcomeType: 'adverse_event',
      probability: '20.0',
      severity: 'moderate',
      expectedDay: 3,
      evidenceSource: 'Test source 2',
      confidenceScore: '90.0',
      description: 'Test outcome 2',
    });

    // Submit feedback from multiple physicians with different patterns
    // Physician 1: High scores (4-5)
    await db.submitInteractionFeedback({
      interactionId: testInteraction1Id,
      scenarioId: testScenario1Id,
      physicianId: testPhysician1Id,
      realismScore: 5,
      clinicalAccuracy: 5,
      conversationalQuality: 4,
      comments: 'Excellent interaction',
    });

    await db.submitOutcomeFeedback({
      outcomeId: testOutcome1Id,
      scenarioId: testScenario1Id,
      physicianId: testPhysician1Id,
      accuracyScore: 5,
      evidenceQuality: 4,
      clinicalRelevance: 5,
      comments: 'Very accurate prediction',
    });

    // Physician 2: Medium scores (3-4)
    await db.submitInteractionFeedback({
      interactionId: testInteraction2Id,
      scenarioId: testScenario2Id,
      physicianId: testPhysician2Id,
      realismScore: 3,
      clinicalAccuracy: 4,
      conversationalQuality: 3,
      comments: 'Decent interaction',
    });

    await db.submitOutcomeFeedback({
      outcomeId: testOutcome2Id,
      scenarioId: testScenario2Id,
      physicianId: testPhysician2Id,
      accuracyScore: 4,
      evidenceQuality: 3,
      clinicalRelevance: 4,
      comments: 'Reasonable prediction',
    });

    // Physician 3: Low scores (2-3)
    await db.submitInteractionFeedback({
      interactionId: testInteraction1Id,
      scenarioId: testScenario1Id,
      physicianId: testPhysician3Id,
      realismScore: 2,
      clinicalAccuracy: 3,
      conversationalQuality: 2,
      comments: 'Needs improvement',
    });

    await db.submitOutcomeFeedback({
      outcomeId: testOutcome1Id,
      scenarioId: testScenario1Id,
      physicianId: testPhysician3Id,
      accuracyScore: 3,
      evidenceQuality: 2,
      clinicalRelevance: 3,
      comments: 'Could be better',
    });
  });

  describe('Peer Comparison Analytics', () => {
    it('should calculate peer comparison for physician 1 (high scorer)', async () => {
      const comparison = await db.getPeerComparisonAnalytics(testPhysician1Id);
      
      expect(comparison).toBeDefined();
      expect(comparison.physician).toBeDefined();
      expect(comparison.peers).toBeDefined();
      expect(comparison.percentiles).toBeDefined();
      expect(comparison.qualityScore).toBeDefined();
      
      // Physician 1 has high scores, should be in high percentile
      expect(comparison.percentiles.overall).toBeGreaterThan(50);
      expect(comparison.qualityScore.interaction).toBeGreaterThanOrEqual(4);
      expect(comparison.qualityScore.outcome).toBeGreaterThanOrEqual(4);
    });

    it('should calculate peer comparison for physician 2 (medium scorer)', async () => {
      const comparison = await db.getPeerComparisonAnalytics(testPhysician2Id);
      
      expect(comparison).toBeDefined();
      
      // Physician 2 has medium scores
      expect(comparison.qualityScore.interaction).toBeGreaterThanOrEqual(3);
      expect(comparison.qualityScore.interaction).toBeLessThan(4.5);
      expect(comparison.qualityScore.outcome).toBeGreaterThanOrEqual(3);
      expect(comparison.qualityScore.outcome).toBeLessThan(4.5);
    });

    it('should calculate peer comparison for physician 3 (low scorer)', async () => {
      const comparison = await db.getPeerComparisonAnalytics(testPhysician3Id);
      
      expect(comparison).toBeDefined();
      
      // Physician 3 has low scores, should be in low percentile
      expect(comparison.percentiles.overall).toBeLessThan(50);
      expect(comparison.qualityScore.interaction).toBeLessThan(3.5);
      expect(comparison.qualityScore.outcome).toBeLessThan(3.5);
    });

    it('should exclude current physician from peer averages', async () => {
      const comparison = await db.getPeerComparisonAnalytics(testPhysician1Id);
      
      // Peer stats should not include physician 1's scores
      expect(comparison.peers.totalPeerCount).toBeGreaterThan(0);
      
      // Peer averages should be different from physician's own averages
      const physicianInteractionAvg = (
        comparison.physician.interactionStats.avgRealismScore +
        comparison.physician.interactionStats.avgClinicalAccuracy +
        comparison.physician.interactionStats.avgConversationalQuality
      ) / 3;
      
      const peerInteractionAvg = (
        comparison.peers.interactionStats.avgRealismScore +
        comparison.peers.interactionStats.avgClinicalAccuracy +
        comparison.peers.interactionStats.avgConversationalQuality
      ) / 3;
      
      // Since physician 1 has high scores and peers have lower scores
      expect(physicianInteractionAvg).toBeGreaterThan(peerInteractionAvg);
    });

    it('should calculate correct percentiles', async () => {
      const comparison1 = await db.getPeerComparisonAnalytics(testPhysician1Id);
      const comparison2 = await db.getPeerComparisonAnalytics(testPhysician2Id);
      const comparison3 = await db.getPeerComparisonAnalytics(testPhysician3Id);
      
      // Physician 1 (high scorer) should have higher percentile than physician 3 (low scorer)
      expect(comparison1.percentiles.overall).toBeGreaterThan(comparison3.percentiles.overall);
      
      // Percentiles should be between 0 and 100
      expect(comparison1.percentiles.overall).toBeGreaterThanOrEqual(0);
      expect(comparison1.percentiles.overall).toBeLessThanOrEqual(100);
      expect(comparison2.percentiles.overall).toBeGreaterThanOrEqual(0);
      expect(comparison2.percentiles.overall).toBeLessThanOrEqual(100);
      expect(comparison3.percentiles.overall).toBeGreaterThanOrEqual(0);
      expect(comparison3.percentiles.overall).toBeLessThanOrEqual(100);
    });
  });

  describe('Feedback Distribution', () => {
    it('should calculate feedback distribution across all physicians', async () => {
      const distribution = await db.getFeedbackDistribution();
      
      expect(distribution).toBeDefined();
      expect(distribution.interaction).toBeDefined();
      expect(distribution.outcome).toBeDefined();
      
      // Check that distributions are arrays of length 5 (for 1-5 stars)
      expect(distribution.interaction.realism).toHaveLength(5);
      expect(distribution.interaction.clinicalAccuracy).toHaveLength(5);
      expect(distribution.interaction.conversationalQuality).toHaveLength(5);
      expect(distribution.outcome.accuracy).toHaveLength(5);
      expect(distribution.outcome.evidenceQuality).toHaveLength(5);
      expect(distribution.outcome.clinicalRelevance).toHaveLength(5);
    });

    it('should have non-zero counts in distribution', async () => {
      const distribution = await db.getFeedbackDistribution();
      
      // Sum of all distribution counts should be > 0
      const interactionTotal = distribution.interaction.realism.reduce((a, b) => a + b, 0);
      const outcomeTotal = distribution.outcome.accuracy.reduce((a, b) => a + b, 0);
      
      expect(interactionTotal).toBeGreaterThan(0);
      expect(outcomeTotal).toBeGreaterThan(0);
    });

    it('should reflect the feedback we submitted', async () => {
      const distribution = await db.getFeedbackDistribution();
      
      // We submitted feedback with scores 2, 3, 4, 5
      // Check that these positions have counts
      expect(distribution.interaction.realism[4]).toBeGreaterThan(0); // 5 stars (index 4)
      expect(distribution.interaction.realism[2]).toBeGreaterThan(0); // 3 stars (index 2)
      expect(distribution.interaction.realism[1]).toBeGreaterThan(0); // 2 stars (index 1)
    });
  });
});
