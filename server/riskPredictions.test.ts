import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

describe("Risk Predictions Integration", () => {
  let testPhysicianId: number;
  let testPatientId: number;
  let testPredictionId: number;

  beforeAll(async () => {
    // Create test physician
    const physicianOpenId = `test-physician-risk-${Date.now()}`;
    await db.upsertUser({
      openId: physicianOpenId,
      name: "Dr. Risk Tester",
      email: "risk.tester@test.com",
    });
    const physician = await db.getUserByOpenId(physicianOpenId);
    testPhysicianId = physician!.id;

    // Create test patient
    testPatientId = await db.createPatient({
      mrn: `MRN-RISK-${Date.now()}`,
      firstName: "Risk",
      lastName: "Patient",
      dateOfBirth: new Date("1970-01-15"),
      gender: "male",
      chronicConditions: ["Hypertension", "Type 2 Diabetes"],
      currentMedications: ["Metformin", "Lisinopril"],
      status: "active",
    });
  });

  it("should create a disease risk prediction", async () => {
    testPredictionId = await db.createRiskPrediction({
      patientId: testPatientId,
      physicianId: testPhysicianId,
      diseaseCode: "I25.10",
      diseaseName: "Atherosclerotic Heart Disease",
      diseaseCategory: "Cardiovascular",
      riskProbability: "0.4500",
      riskLevel: "high",
      timeHorizon: 10,
      confidenceScore: "0.8500",
      predictionSource: "Delphi-2M",
      inputFeatures: {
        age: 54,
        gender: "male",
        bmi: 28.5,
        tobaccoUse: false,
        medicalHistory: ["Hypertension", "Type 2 Diabetes"],
      },
    });

    expect(testPredictionId).toBeGreaterThan(0);
  });

  it("should retrieve risk predictions for a patient", async () => {
    const predictions = await db.getRiskPredictionsByPatient(testPatientId);

    expect(predictions).toBeDefined();
    expect(predictions.length).toBeGreaterThan(0);
    expect(predictions[0].diseaseName).toBe("Atherosclerotic Heart Disease");
    expect(predictions[0].riskLevel).toBe("high");
  });

  it("should retrieve high-risk predictions above threshold", async () => {
    const highRiskPredictions = await db.getHighRiskPredictions(testPatientId, 0.3);

    expect(highRiskPredictions).toBeDefined();
    expect(highRiskPredictions.length).toBeGreaterThan(0);
    expect(Number(highRiskPredictions[0].riskProbability)).toBeGreaterThanOrEqual(0.3);
  });

  it("should retrieve pending risk predictions for physician", async () => {
    const pendingPredictions = await db.getPendingRiskPredictions(testPhysicianId);

    expect(pendingPredictions).toBeDefined();
    expect(pendingPredictions.length).toBeGreaterThan(0);
    expect(pendingPredictions[0].actionTaken).toBe("pending");
  });

  it("should update risk prediction action status", async () => {
    await db.updateRiskPredictionAction(testPredictionId, "explored");

    const prediction = await db.getRiskPredictionById(testPredictionId);

    expect(prediction).toBeDefined();
    expect(prediction!.actionTaken).toBe("explored");
    expect(prediction!.reviewedAt).toBeDefined();
  });

  it("should link risk prediction to simulation scenario", async () => {
    // Create a test clinical session first
    const sessionId = await db.createClinicalSession({
      patientId: testPatientId,
      physicianId: testPhysicianId,
      sessionType: "initial_consultation",
      sessionDate: new Date(),
      status: "in_progress",
    });

    // Create a simulation scenario
    const scenarioId = await db.createSimulationScenario({
      sessionId,
      physicianId: testPhysicianId,
      patientId: testPatientId,
      scenarioName: "Lifestyle Modification Program",
      diagnosisCode: "I25.10",
      treatmentCode: "PREV-001",
      treatmentDescription: "Comprehensive lifestyle modification with diet and exercise",
      patientAge: 54,
      patientGender: "male",
      timeHorizon: 3650, // 10 years in days
      simulationGoal: "Prevent atherosclerotic heart disease progression",
      status: "draft",
    });

    // Update risk prediction with simulation link
    await db.updateRiskPredictionAction(testPredictionId, "explored", scenarioId);

    const prediction = await db.getRiskPredictionById(testPredictionId);

    expect(prediction).toBeDefined();
    expect(prediction!.scenarioGenerated).toBe(true);
    expect(prediction!.simulationId).toBe(scenarioId);
  });

  it("should calculate risk prediction statistics", async () => {
    // Create additional predictions for stats
    await db.createRiskPrediction({
      patientId: testPatientId,
      physicianId: testPhysicianId,
      diseaseCode: "E11.9",
      diseaseName: "Type 2 Diabetes Mellitus",
      diseaseCategory: "Metabolic",
      riskProbability: "0.2500",
      riskLevel: "moderate",
      timeHorizon: 5,
      confidenceScore: "0.7500",
      predictionSource: "Delphi-2M",
    });

    await db.createRiskPrediction({
      patientId: testPatientId,
      physicianId: testPhysicianId,
      diseaseCode: "C34.90",
      diseaseName: "Malignant Neoplasm of Lung",
      diseaseCategory: "Cancer",
      riskProbability: "0.1500",
      riskLevel: "low",
      timeHorizon: 20,
      confidenceScore: "0.6500",
      predictionSource: "Delphi-2M",
    });

    const stats = await db.getRiskPredictionStats(testPhysicianId);

    expect(stats).toBeDefined();
    expect(stats.totalPredictions).toBeGreaterThanOrEqual(3);
    expect(stats.highRiskCount).toBeGreaterThanOrEqual(1);
    expect(stats.exploredCount).toBeGreaterThanOrEqual(1);
    expect(stats.explorationRate).toBeGreaterThan(0);
  });

  it("should retrieve risk prediction by ID", async () => {
    const prediction = await db.getRiskPredictionById(testPredictionId);

    expect(prediction).toBeDefined();
    expect(prediction!.id).toBe(testPredictionId);
    expect(prediction!.diseaseName).toBe("Atherosclerotic Heart Disease");
    expect(prediction!.riskLevel).toBe("high");
  });

  it("should handle multiple risk predictions for same patient", async () => {
    const predictions = await db.getRiskPredictionsByPatient(testPatientId);

    expect(predictions.length).toBeGreaterThanOrEqual(3);

    // Verify predictions are ordered by risk probability (descending)
    for (let i = 0; i < predictions.length - 1; i++) {
      const currentRisk = Number(predictions[i].riskProbability);
      const nextRisk = Number(predictions[i + 1].riskProbability);
      expect(currentRisk).toBeGreaterThanOrEqual(nextRisk);
    }
  });

  it("should filter predictions by action status", async () => {
    const allPredictions = await db.getRiskPredictionsByPatient(testPatientId);
    const pendingPredictions = await db.getPendingRiskPredictions(testPhysicianId);

    expect(allPredictions.length).toBeGreaterThan(pendingPredictions.length);

    // Verify all pending predictions have 'pending' status
    pendingPredictions.forEach((pred: any) => {
      expect(pred.actionTaken).toBe("pending");
    });
  });
});
