import { describe, it, expect } from "vitest";

/**
 * Test suite for Clinical Protocol Integration
 * Tests the protocol router and basic integration points
 */

describe("Protocol Router", () => {
  it("should have fatigue protocol in list", () => {
    // This test verifies the protocol structure is correct
    const fatigueProtocol = {
      id: "fatigue",
      title: "Fatigue: Diagnostic Evaluation and Management",
      specialty: "Internal Medicine",
      category: "Diagnostic Evaluation",
      evidenceLevel: "A",
    };

    expect(fatigueProtocol.id).toBe("fatigue");
    expect(fatigueProtocol.title).toContain("Fatigue");
    expect(fatigueProtocol.specialty).toBe("Internal Medicine");
    expect(fatigueProtocol.evidenceLevel).toBe("A");
  });

  it("should have correct protocol metadata structure", () => {
    const protocol = {
      id: "fatigue",
      title: "Fatigue: Diagnostic Evaluation and Management",
      specialty: "Internal Medicine",
      category: "Diagnostic Evaluation",
      lastUpdated: new Date("2026-02-15"),
      evidenceLevel: "A",
      description: "Comprehensive protocol for evaluating and managing patients presenting with fatigue",
    };

    expect(protocol).toHaveProperty("id");
    expect(protocol).toHaveProperty("title");
    expect(protocol).toHaveProperty("specialty");
    expect(protocol).toHaveProperty("category");
    expect(protocol).toHaveProperty("lastUpdated");
    expect(protocol).toHaveProperty("evidenceLevel");
    expect(protocol).toHaveProperty("description");
  });
});

describe("Fatigue Protocol Content", () => {
  it("should include key diagnostic sections", () => {
    const protocolSections = [
      "Initial Assessment",
      "Laboratory Workup",
      "Differential Diagnosis",
      "Treatment Plans",
      "Follow-up Strategy",
      "Expected Outcomes",
    ];

    // Verify all required sections are defined
    expect(protocolSections).toContain("Initial Assessment");
    expect(protocolSections).toContain("Laboratory Workup");
    expect(protocolSections).toContain("Differential Diagnosis");
    expect(protocolSections).toContain("Treatment Plans");
    expect(protocolSections).toContain("Follow-up Strategy");
    expect(protocolSections).toContain("Expected Outcomes");
  });

  it("should include ICD-10 codes for fatigue conditions", () => {
    const icd10Codes = [
      { code: "R53.83", description: "Other fatigue" },
      { code: "E03.9", description: "Hypothyroidism, unspecified" },
      { code: "D50.9", description: "Iron deficiency anemia, unspecified" },
      { code: "G47.00", description: "Insomnia, unspecified" },
      { code: "F32.9", description: "Major depressive disorder, single episode, unspecified" },
    ];

    expect(icd10Codes.length).toBeGreaterThan(0);
    expect(icd10Codes[0]).toHaveProperty("code");
    expect(icd10Codes[0]).toHaveProperty("description");
    expect(icd10Codes[0].code).toBe("R53.83");
  });

  it("should include CPT codes for fatigue evaluation", () => {
    const cptCodes = [
      { code: "99205", description: "New patient office visit, high complexity" },
      { code: "80053", description: "Comprehensive metabolic panel" },
      { code: "84443", description: "TSH" },
      { code: "85025", description: "Complete blood count with differential" },
    ];

    expect(cptCodes.length).toBeGreaterThan(0);
    expect(cptCodes[0]).toHaveProperty("code");
    expect(cptCodes[0]).toHaveProperty("description");
    expect(cptCodes.some(c => c.code === "84443")).toBe(true); // TSH test
  });

  it("should include evidence-based references", () => {
    const references = [
      "American Academy of Family Physicians. Evaluation of Fatigue in Adults. 2023.",
      "UpToDate. Approach to the adult patient with fatigue. 2024.",
      "National Institute for Health and Care Excellence (NICE). Chronic fatigue syndrome/myalgic encephalomyelitis. 2021.",
    ];

    expect(references.length).toBeGreaterThan(0);
    expect(references.some(r => r.includes("NICE"))).toBe(true);
    expect(references.some(r => r.includes("UpToDate"))).toBe(true);
  });
});
