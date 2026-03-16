/**
 * ICD-10-CM Validation Tests
 *
 * Validates that:
 * 1. lookupIcd10Code returns correct rows for known codes
 * 2. lookupIcd10Code returns undefined for non-existent codes
 * 3. suggestBillableCodes returns leaf codes for category-level inputs
 * 4. validateDiagnosisCode correctly classifies valid, encounter, and not-found codes
 * 5. auditOutcomeDefinitionCodes returns zero issues for the current seeded data
 */

import { describe, it, expect } from "vitest";
import {
  lookupIcd10Code,
  suggestBillableCodes,
  validateDiagnosisCode,
  auditOutcomeDefinitionCodes,
} from "./db";

describe("lookupIcd10Code", () => {
  it("returns correct row for R53.0 (neoplastic fatigue)", async () => {
    const row = await lookupIcd10Code("R53.0");
    expect(row).toBeDefined();
    expect(row!.code).toBe("R53.0");
    expect(row!.shortDesc.toLowerCase()).toContain("neoplastic");
    expect(row!.isBillable).toBe(1);
    expect(row!.codeType).toBe("diagnosis");
  });

  it("returns correct row for I10 (essential hypertension)", async () => {
    const row = await lookupIcd10Code("I10");
    expect(row).toBeDefined();
    expect(row!.code).toBe("I10");
    expect(row!.isBillable).toBe(1);
  });

  it("returns undefined for a non-existent code", async () => {
    const row = await lookupIcd10Code("ZZZ.999");
    expect(row).toBeUndefined();
  });

  it("returns undefined for category-level code E11 (no decimal)", async () => {
    // E11 is a category header — not in the tabular as a standalone billable code
    const row = await lookupIcd10Code("E11");
    expect(row).toBeUndefined();
  });
});

describe("suggestBillableCodes", () => {
  it("returns leaf codes for E11 category", async () => {
    const suggestions = await suggestBillableCodes("E11");
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.every((c) => c.startsWith("E11."))).toBe(true);
  });

  it("returns empty array for non-existent category", async () => {
    const suggestions = await suggestBillableCodes("ZZZ");
    expect(suggestions).toEqual([]);
  });

  it("respects the limit parameter", async () => {
    const suggestions = await suggestBillableCodes("F32", 3);
    expect(suggestions.length).toBeLessThanOrEqual(3);
  });
});

describe("validateDiagnosisCode", () => {
  it("accepts a valid billable diagnosis code (E11.9)", async () => {
    const result = await validateDiagnosisCode("E11.9");
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.icd.code).toBe("E11.9");
      expect(result.icd.isBillable).toBe(1);
    }
  });

  it("accepts I10 (essential hypertension — billable without decimal)", async () => {
    const result = await validateDiagnosisCode("I10");
    expect(result.valid).toBe(true);
  });

  it("rejects a non-existent code", async () => {
    const result = await validateDiagnosisCode("ZZZ.999");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("not found");
    }
  });

  it("rejects a non-billable category code (E11)", async () => {
    const result = await validateDiagnosisCode("E11");
    // E11 is not in the tabular at all — should be not_found
    expect(result.valid).toBe(false);
  });

  it("rejects Z51.11 (encounter for antineoplastic chemotherapy)", async () => {
    const result = await validateDiagnosisCode("Z51.11");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      // Should flag as encounter code
      expect(result.reason.toLowerCase()).toMatch(/encounter|not found/);
    }
  });
});

describe("auditOutcomeDefinitionCodes — full DB audit", () => {
  it("returns zero issues for all currently seeded outcome definitions", async () => {
    const results = await auditOutcomeDefinitionCodes();

    expect(results.length).toBeGreaterThan(0);

    const issues = results.filter((r) => r.status !== "valid");

    if (issues.length > 0) {
      console.error(
        "Audit issues found:\n" +
          issues
            .map((i) => `  ${i.diagnosisCode} [${i.status}] ${i.conditionName}`)
            .join("\n")
      );
    }

    expect(issues.length).toBe(0);
  });

  it("confirms R53.0 is valid (not the old Z51.1 encounter code)", async () => {
    const results = await auditOutcomeDefinitionCodes();
    const cancerFatigue = results.find((r) => r.diagnosisCode === "R53.0");
    expect(cancerFatigue).toBeDefined();
    expect(cancerFatigue!.status).toBe("valid");
  });

  it("confirms no encounter codes exist in outcome_definitions", async () => {
    const results = await auditOutcomeDefinitionCodes();
    const encounterCodes = results.filter((r) => r.status === "encounter_code");
    expect(encounterCodes.length).toBe(0);
  });

  it("confirms all 31 outcome definitions are present and valid", async () => {
    const results = await auditOutcomeDefinitionCodes();
    expect(results.length).toBe(31);
    const valid = results.filter((r) => r.status === "valid");
    expect(valid.length).toBe(31);
  });
});
