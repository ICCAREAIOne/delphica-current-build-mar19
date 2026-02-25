/**
 * Tests for Semantic Processor - Medical Coding Bridge
 */

import { describe, it, expect } from "vitest";
import {
  processClinicalNote,
  generateICD10Codes,
  generateCPTCodes,
  extractClinicalEntities,
  type ClinicalNote,
} from "./semanticProcessor";

describe("Semantic Processor - Medical Coding Bridge", () => {
  describe("ICD-10 Code Generation", () => {
    it("should generate ICD-10 codes for hypertension", async () => {
      const clinicalNote: ClinicalNote = {
        chiefComplaint: "High blood pressure",
        historyOfPresentIllness:
          "Patient reports elevated blood pressure readings at home (150/95). No chest pain or shortness of breath.",
        physicalExam: "BP: 152/94, HR: 78, regular rhythm",
        assessment: "Essential hypertension, uncontrolled",
        plan: "Start lisinopril 10mg daily, lifestyle modifications, follow-up in 2 weeks",
      };

      const codes = await generateICD10Codes(clinicalNote);

      expect(codes).toBeDefined();
      expect(codes.length).toBeGreaterThan(0);
      expect(codes[0].code).toMatch(/^I\d+/); // ICD-10 codes start with letter
      expect(codes[0].description).toBeTruthy();
      expect(codes[0].confidence).toBeGreaterThan(0.5);
      expect(codes.some((c) => c.category === "primary")).toBe(true);
    }, 30000);

    it("should generate ICD-10 codes for diabetes", async () => {
      const clinicalNote: ClinicalNote = {
        chiefComplaint: "Elevated blood sugar",
        historyOfPresentIllness:
          "Patient with fasting glucose 180 mg/dL, polyuria, polydipsia for 2 months",
        assessment: "Type 2 diabetes mellitus without complications",
        plan: "Start metformin 500mg BID, diabetes education, HbA1c in 3 months",
      };

      const codes = await generateICD10Codes(clinicalNote);

      expect(codes).toBeDefined();
      expect(codes.length).toBeGreaterThan(0);
      expect(codes[0].code).toMatch(/^E\d+/); // Endocrine codes start with E
      expect(codes[0].confidence).toBeGreaterThan(0.6);
    }, 30000);
  });

  describe("CPT Code Generation", () => {
    it("should generate CPT codes for office visit", async () => {
      const clinicalNote: ClinicalNote = {
        chiefComplaint: "Follow-up visit for hypertension",
        plan: "Continue current medications, return in 3 months",
      };

      const codes = await generateCPTCodes(clinicalNote);

      expect(codes).toBeDefined();
      expect(codes.length).toBeGreaterThan(0);
      expect(codes[0].code).toMatch(/^\d{5}$/); // CPT codes are 5 digits
      expect(codes[0].description).toBeTruthy();
      expect(codes[0].confidence).toBeGreaterThan(0.5);
    }, 30000);

    it("should generate CPT codes with procedures", async () => {
      const clinicalNote: ClinicalNote = {
        chiefComplaint: "Skin lesion removal",
        procedures: ["Excision of benign skin lesion, 1.5cm"],
        plan: "Wound care instructions, follow-up in 2 weeks for suture removal",
      };

      const codes = await generateCPTCodes(clinicalNote);

      expect(codes).toBeDefined();
      expect(codes.length).toBeGreaterThan(0);
      // Should include both E&M code and procedure code
      expect(codes.length).toBeGreaterThanOrEqual(1);
    }, 30000);
  });

  describe("Clinical Entity Extraction", () => {
    it("should extract symptoms and diagnoses", async () => {
      const clinicalNote: ClinicalNote = {
        chiefComplaint: "Chest pain and shortness of breath",
        historyOfPresentIllness:
          "Patient reports substernal chest pressure for 2 hours, radiating to left arm. Associated with dyspnea and diaphoresis.",
        assessment: "Acute coronary syndrome, rule out myocardial infarction",
      };

      const entities = await extractClinicalEntities(clinicalNote);

      expect(entities.symptoms).toBeDefined();
      expect(entities.symptoms.length).toBeGreaterThan(0);
      expect(entities.diagnoses).toBeDefined();
      expect(entities.diagnoses.length).toBeGreaterThan(0);
      expect(entities.snomedConcepts).toBeDefined();
      expect(entities.snomedConcepts.length).toBeGreaterThan(0);
    }, 30000);

    it("should extract medications and anatomical sites", async () => {
      const clinicalNote: ClinicalNote = {
        chiefComplaint: "Knee pain",
        physicalExam: "Right knee: swelling, tenderness, limited range of motion",
        plan: "Ibuprofen 400mg TID, ice, elevation, physical therapy referral",
      };

      const entities = await extractClinicalEntities(clinicalNote);

      expect(entities.medications).toBeDefined();
      expect(entities.medications.some((m) => m.toLowerCase().includes("ibuprofen"))).toBe(true);
      expect(entities.anatomicalSites).toBeDefined();
      expect(entities.anatomicalSites.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe("Complete Semantic Processing Pipeline", () => {
    it("should process complete clinical note with all code types", async () => {
      const clinicalNote: ClinicalNote = {
        chiefComplaint: "Annual physical examination",
        historyOfPresentIllness: "Patient feels well, no acute complaints",
        physicalExam:
          "BP: 128/82, HR: 72, BMI: 26.5. General: well-appearing. HEENT: normal. Cardiovascular: regular rate and rhythm. Lungs: clear. Abdomen: soft, non-tender.",
        assessment:
          "1. Overweight (BMI 26.5)\n2. Hyperlipidemia, controlled on statin\n3. Health maintenance up to date",
        plan: "Continue atorvastatin 20mg daily, diet and exercise counseling, return in 1 year",
      };

      const result = await processClinicalNote(clinicalNote);

      expect(result).toBeDefined();
      expect(result.icd10Codes).toBeDefined();
      expect(result.icd10Codes.length).toBeGreaterThan(0);
      expect(result.cptCodes).toBeDefined();
      expect(result.cptCodes.length).toBeGreaterThan(0);
      expect(result.snomedConcepts).toBeDefined();
      expect(result.extractedEntities).toBeDefined();
      expect(result.codingNotes).toBeTruthy();
      expect(result.confidenceScore).toBeGreaterThan(0);
      expect(result.confidenceScore).toBeLessThanOrEqual(1);
    }, 60000);

    it("should handle complex multi-problem visit", async () => {
      const clinicalNote: ClinicalNote = {
        chiefComplaint: "Multiple chronic conditions follow-up",
        historyOfPresentIllness:
          "Patient with Type 2 DM, HTN, and hyperlipidemia. Blood sugars running 120-150. BP controlled. No chest pain or dyspnea.",
        physicalExam: "BP: 132/78, HR: 76, A1c: 7.2%",
        assessment:
          "1. Type 2 diabetes mellitus, adequately controlled\n2. Essential hypertension, controlled\n3. Hyperlipidemia, controlled",
        plan: "Continue metformin, lisinopril, atorvastatin. Recheck labs in 3 months.",
      };

      const result = await processClinicalNote(clinicalNote);

      expect(result.icd10Codes.length).toBeGreaterThanOrEqual(3); // At least 3 diagnoses
      expect(result.icd10Codes.some((c) => c.category === "primary")).toBe(true);
      expect(result.extractedEntities.diagnoses.length).toBeGreaterThan(0);
      expect(result.extractedEntities.medications.length).toBeGreaterThan(0);
    }, 60000);
  });

  describe("Code Quality and Validation", () => {
    it("should generate codes with high confidence for clear diagnoses", async () => {
      const clinicalNote: ClinicalNote = {
        chiefComplaint: "Type 2 diabetes mellitus",
        assessment: "Type 2 diabetes mellitus without complications, well-controlled",
      };

      const codes = await generateICD10Codes(clinicalNote);

      expect(codes[0].confidence).toBeGreaterThan(0.8); // High confidence for clear diagnosis
    }, 30000);

    it("should include primary diagnosis marker", async () => {
      const clinicalNote: ClinicalNote = {
        chiefComplaint: "Chest pain",
        assessment:
          "1. Acute myocardial infarction (primary)\n2. Hypertension\n3. Hyperlipidemia",
      };

      const codes = await generateICD10Codes(clinicalNote);

      const primaryCodes = codes.filter((c) => c.category === "primary");
      expect(primaryCodes.length).toBeGreaterThanOrEqual(1);
    }, 30000);
  });
});
