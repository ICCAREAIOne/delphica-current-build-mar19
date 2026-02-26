import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import * as db from './db';

describe('Enhanced DAO Protocol', () => {
  let testPatientId: number;
  let testUserId: number;

  beforeAll(async () => {
    // Use test user ID (tests run with authenticated context)
    testUserId = 1;

    // Create test patient
    testPatientId = await db.createPatient({
      mrn: `MRN-ENHANCED-DAO-${Date.now()}`,
      firstName: 'Enhanced',
      lastName: 'DAO Test',
      dateOfBirth: new Date('1980-01-01'),
      gender: 'male',
      email: 'enhanced-dao-test@example.com',
      phone: '555-0199',
    });
  });

  describe('Lifestyle Assessment', () => {
    it('should create lifestyle assessment', async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, openId: 'test-enhanced-dao-user', name: 'Test User', email: 'test@example.com', role: 'user' },
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.enhancedDAO.createLifestyleAssessment({
        patientId: testPatientId,
        assessmentDate: new Date(),
        smokingStatus: 'current',
        cigarettesPerDay: 10,
        yearsSmoked: 15,
        alcoholConsumption: 'moderate',
        drinksPerWeek: 5,
        bingeDrinking: false,
        exerciseFrequency: 'light',
        minutesPerWeek: 90,
        exerciseTypes: ['walking', 'cycling'],
        dietQuality: 'fair',
        fruitsVegetablesPerDay: 3,
        fastFoodFrequency: 'weekly',
        sodaConsumption: 'occasional',
        sleepHoursPerNight: '7',
        sleepQuality: 'good',
        sleepDisorders: [],
        stressLevel: 'moderate',
        mentalHealthConditions: [],
        occupationalHazards: [],
        environmentalExposures: [],
      });

      expect(result.assessmentId).toBeGreaterThan(0);
    });

    it('should get lifestyle assessments for patient', async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, openId: 'test-enhanced-dao-user', name: 'Test User', email: 'test@example.com', role: 'user' },
        req: {} as any,
        res: {} as any,
      });

      const assessments = await caller.enhancedDAO.getLifestyleAssessments({
        patientId: testPatientId,
      });

      expect(Array.isArray(assessments)).toBe(true);
      expect(assessments.length).toBeGreaterThan(0);
      expect(assessments[0].smokingStatus).toBe('current');
    });

    it('should get latest lifestyle assessment', async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, openId: 'test-enhanced-dao-user', name: 'Test User', email: 'test@example.com', role: 'user' },
        req: {} as any,
        res: {} as any,
      });

      const latest = await caller.enhancedDAO.getLatestLifestyleAssessment({
        patientId: testPatientId,
      });

      expect(latest).toBeDefined();
      expect(latest?.smokingStatus).toBe('current');
      expect(latest?.exerciseFrequency).toBe('light');
    });
  });

  describe('Family History', () => {
    it('should create family history entry', async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, openId: 'test-enhanced-dao-user', name: 'Test User', email: 'test@example.com', role: 'user' },
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.enhancedDAO.createFamilyHistory({
        patientId: testPatientId,
        relationship: 'mother',
        condition: 'Type 2 Diabetes',
        icdCode: 'E11',
        ageAtDiagnosis: 55,
        currentAge: 72,
        isAlive: true,
        isConfirmed: true,
      });

      expect(result.historyId).toBeGreaterThan(0);
    });

    it('should get family histories for patient', async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, openId: 'test-enhanced-dao-user', name: 'Test User', email: 'test@example.com', role: 'user' },
        req: {} as any,
        res: {} as any,
      });

      const histories = await caller.enhancedDAO.getFamilyHistories({
        patientId: testPatientId,
      });

      expect(Array.isArray(histories)).toBe(true);
      expect(histories.length).toBeGreaterThan(0);
      expect(histories[0].condition).toBe('Type 2 Diabetes');
    });

    it('should get family histories by condition', async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, openId: 'test-enhanced-dao-user', name: 'Test User', email: 'test@example.com', role: 'user' },
        req: {} as any,
        res: {} as any,
      });

      const histories = await caller.enhancedDAO.getFamilyHistoriesByCondition({
        patientId: testPatientId,
        condition: 'Type 2 Diabetes',
      });

      expect(Array.isArray(histories)).toBe(true);
      expect(histories.length).toBeGreaterThan(0);
    });
  });

  describe('Biomarkers', () => {
    it('should create biomarker measurement', async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, openId: 'test-enhanced-dao-user', name: 'Test User', email: 'test@example.com', role: 'user' },
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.enhancedDAO.createBiomarker({
        patientId: testPatientId,
        measurementDate: new Date(),
        biomarkerType: 'total_cholesterol',
        value: '220',
        unit: 'mg/dL',
        referenceRangeLow: '125',
        referenceRangeHigh: '200',
        isAbnormal: true,
        source: 'lab_test',
        labOrderId: 'LAB-2024-12345',
      });

      expect(result.biomarkerId).toBeGreaterThan(0);
    });

    it('should get biomarkers for patient', async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, openId: 'test-enhanced-dao-user', name: 'Test User', email: 'test@example.com', role: 'user' },
        req: {} as any,
        res: {} as any,
      });

      const biomarkers = await caller.enhancedDAO.getBiomarkers({
        patientId: testPatientId,
      });

      expect(Array.isArray(biomarkers)).toBe(true);
      expect(biomarkers.length).toBeGreaterThan(0);
      expect(biomarkers[0].biomarkerType).toBe('total_cholesterol');
    });

    it('should get abnormal biomarkers', async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, openId: 'test-enhanced-dao-user', name: 'Test User', email: 'test@example.com', role: 'user' },
        req: {} as any,
        res: {} as any,
      });

      const abnormal = await caller.enhancedDAO.getAbnormalBiomarkers({
        patientId: testPatientId,
      });

      expect(Array.isArray(abnormal)).toBe(true);
      expect(abnormal.length).toBeGreaterThan(0);
      expect(abnormal[0].isAbnormal).toBe(true);
    });

    it('should get biomarker trends', async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, openId: 'test-enhanced-dao-user', name: 'Test User', email: 'test@example.com', role: 'user' },
        req: {} as any,
        res: {} as any,
      });

      // Create another cholesterol measurement
      await caller.enhancedDAO.createBiomarker({
        patientId: testPatientId,
        measurementDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        biomarkerType: 'total_cholesterol',
        value: '210',
        unit: 'mg/dL',
        source: 'lab_test',
      });

      const trends = await caller.enhancedDAO.getBiomarkerTrends({
        patientId: testPatientId,
        biomarkerType: 'total_cholesterol',
        limit: 10,
      });

      expect(Array.isArray(trends)).toBe(true);
      expect(trends.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Data Aggregation for Delphi-2M', () => {
    it('should aggregate patient data for risk prediction', async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, openId: 'test-enhanced-dao-user', name: 'Test User', email: 'test@example.com', role: 'user' },
        req: {} as any,
        res: {} as any,
      });

      const aggregated = await caller.riskPredictions.aggregatePatientData({
        patientId: testPatientId,
      });

      expect(aggregated.patientId).toBe(testPatientId);
      expect(aggregated.lifestyleData).toBeDefined();
      expect(aggregated.familyHistory).toBeDefined();
      expect(aggregated.biomarkers).toBeDefined();
      expect(aggregated.riskFactors).toBeDefined();
      expect(aggregated.riskScore).toBeGreaterThan(0);
      expect(aggregated.dataCompleteness.hasLifestyleData).toBe(true);
      expect(aggregated.dataCompleteness.hasFamilyHistory).toBe(true);
      expect(aggregated.dataCompleteness.hasBiomarkers).toBe(true);
    });

    it('should identify smoking risk factor', async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, openId: 'test-enhanced-dao-user', name: 'Test User', email: 'test@example.com', role: 'user' },
        req: {} as any,
        res: {} as any,
      });

      const aggregated = await caller.riskPredictions.aggregatePatientData({
        patientId: testPatientId,
      });

      expect(aggregated.riskFactors.smoking).toBe(true);
    });

    it('should identify family history risk factors', async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, openId: 'test-enhanced-dao-user', name: 'Test User', email: 'test@example.com', role: 'user' },
        req: {} as any,
        res: {} as any,
      });

      const aggregated = await caller.riskPredictions.aggregatePatientData({
        patientId: testPatientId,
      });

      expect(aggregated.riskFactors.familyHistoryDiabetes).toBe(true);
    });

    it('should identify biomarker risk factors', async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, openId: 'test-enhanced-dao-user', name: 'Test User', email: 'test@example.com', role: 'user' },
        req: {} as any,
        res: {} as any,
      });

      const aggregated = await caller.riskPredictions.aggregatePatientData({
        patientId: testPatientId,
      });

      expect(aggregated.riskFactors.highCholesterol).toBe(true);
    });
  });
});
