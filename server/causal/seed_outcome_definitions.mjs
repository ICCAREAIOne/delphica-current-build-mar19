/**
 * seed_outcome_definitions.mjs
 * Seeds the outcome_definitions table with validated clinical success criteria
 * sourced from major clinical guidelines (ADA 2024, ACC/AHA 2023, GOLD 2024,
 * ACR 2021, KDIGO 2022, DSM-5, USPSTF, JNC 8, ACS, AASLD, etc.)
 *
 * Run: node server/causal/seed_outcome_definitions.mjs
 */

import { createConnection } from "mysql2/promise";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load DATABASE_URL from .env
let DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  try {
    const envPath = resolve(__dirname, "../../.env");
    const envContent = readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const [key, ...rest] = line.split("=");
      if (key?.trim() === "DATABASE_URL") {
        DATABASE_URL = rest.join("=").trim().replace(/^["']|["']$/g, "");
        break;
      }
    }
  } catch {}
}
if (!DATABASE_URL) {
  const envFile = resolve(__dirname, "../../.user_env");
  try {
    const content = readFileSync(envFile, "utf-8");
    for (const line of content.split("\n")) {
      const [key, ...rest] = line.split("=");
      if (key?.trim() === "DATABASE_URL") {
        DATABASE_URL = rest.join("=").trim().replace(/^["']|["']$/g, "");
        break;
      }
    }
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// OUTCOME DEFINITIONS
// Fields: diagnosisCode, conditionName, measurementInstrument, measurementUnit,
//         successOperator, successThreshold, timeHorizonDays,
//         guidelineSource, evidenceGrade, successCriteriaSummary,
//         isComposite, compositeGroupId
// Operators: lt (<), lte (<=), gt (>), gte (>=), drop_by (decrease by N), reach (reach N)
// ─────────────────────────────────────────────────────────────────────────────
const definitions = [
  // ── METABOLIC / ENDOCRINE ──────────────────────────────────────────────────
  {
    diagnosisCode: "E11",
    conditionName: "Type 2 Diabetes Mellitus",
    measurementInstrument: "HbA1c",
    measurementUnit: "%",
    successOperator: "lt",
    successThreshold: 7.0,
    timeHorizonDays: 90,
    guidelineSource: "ADA Standards of Care 2024",
    evidenceGrade: "A",
    successCriteriaSummary: "HbA1c < 7.0% at 90 days. Individualize to < 8.0% for elderly or high hypoglycemia risk.",
    isComposite: false,
    compositeGroupId: null,
  },
  {
    diagnosisCode: "E11",
    conditionName: "Type 2 Diabetes Mellitus — Fasting Glucose",
    measurementInstrument: "Fasting Plasma Glucose",
    measurementUnit: "mg/dL",
    successOperator: "lt",
    successThreshold: 130,
    timeHorizonDays: 90,
    guidelineSource: "ADA Standards of Care 2024",
    evidenceGrade: "B",
    successCriteriaSummary: "Fasting plasma glucose < 130 mg/dL. Secondary target alongside HbA1c.",
    isComposite: false,
    compositeGroupId: null,
  },
  {
    diagnosisCode: "E10",
    conditionName: "Type 1 Diabetes Mellitus",
    measurementInstrument: "HbA1c",
    measurementUnit: "%",
    successOperator: "lt",
    successThreshold: 7.0,
    timeHorizonDays: 90,
    guidelineSource: "ADA Standards of Care 2024",
    evidenceGrade: "A",
    successCriteriaSummary: "HbA1c < 7.0% at 90 days. Time-in-range > 70% (CGM preferred).",
    isComposite: false,
    compositeGroupId: null,
  },
  {
    diagnosisCode: "E66",
    conditionName: "Obesity",
    measurementInstrument: "Body Weight",
    measurementUnit: "% body weight",
    successOperator: "drop_by",
    successThreshold: 5.0,
    timeHorizonDays: 180,
    guidelineSource: "AACE/ACE Obesity Guidelines 2016 (updated 2022)",
    evidenceGrade: "A",
    successCriteriaSummary: "≥ 5% body weight reduction at 6 months. ≥ 10% for metabolic benefit.",
    isComposite: false,
    compositeGroupId: null,
  },
  {
    diagnosisCode: "E78.5",
    conditionName: "Hyperlipidemia — LDL-C",
    measurementInstrument: "LDL Cholesterol",
    measurementUnit: "mg/dL",
    successOperator: "lt",
    successThreshold: 70,
    timeHorizonDays: 90,
    guidelineSource: "ACC/AHA Cholesterol Guidelines 2018",
    evidenceGrade: "A",
    successCriteriaSummary: "LDL-C < 70 mg/dL for very high CV risk. < 100 mg/dL for high risk. ≥ 50% reduction from baseline for all ASCVD patients.",
    isComposite: false,
    compositeGroupId: null,
  },

  // ── CARDIOVASCULAR ─────────────────────────────────────────────────────────
  {
    diagnosisCode: "I10",
    conditionName: "Essential Hypertension",
    measurementInstrument: "Systolic Blood Pressure",
    measurementUnit: "mmHg",
    successOperator: "lt",
    successThreshold: 130,
    timeHorizonDays: 60,
    guidelineSource: "ACC/AHA Hypertension Guidelines 2017",
    evidenceGrade: "A",
    successCriteriaSummary: "SBP < 130 mmHg at 60 days for most adults. < 140 mmHg acceptable for age ≥ 65 with high fall risk.",
    isComposite: false,
    compositeGroupId: null,
  },
  {
    diagnosisCode: "I10",
    conditionName: "Essential Hypertension — Diastolic",
    measurementInstrument: "Diastolic Blood Pressure",
    measurementUnit: "mmHg",
    successOperator: "lt",
    successThreshold: 80,
    timeHorizonDays: 60,
    guidelineSource: "ACC/AHA Hypertension Guidelines 2017",
    evidenceGrade: "A",
    successCriteriaSummary: "DBP < 80 mmHg at 60 days.",
    isComposite: false,
    compositeGroupId: null,
  },
  {
    diagnosisCode: "I48",
    conditionName: "Atrial Fibrillation — Rate Control",
    measurementInstrument: "Resting Heart Rate",
    measurementUnit: "bpm",
    successOperator: "lte",
    successThreshold: 80,
    timeHorizonDays: 30,
    guidelineSource: "ACC/AHA/HRS AF Guidelines 2023",
    evidenceGrade: "B",
    successCriteriaSummary: "Resting HR ≤ 80 bpm at 30 days (lenient: ≤ 110 bpm if asymptomatic).",
    isComposite: false,
    compositeGroupId: null,
  },
  {
    diagnosisCode: "I50",
    conditionName: "Heart Failure — LVEF",
    measurementInstrument: "Left Ventricular Ejection Fraction",
    measurementUnit: "%",
    successOperator: "gte",
    successThreshold: 40,
    timeHorizonDays: 180,
    guidelineSource: "ACC/AHA Heart Failure Guidelines 2022",
    evidenceGrade: "B",
    successCriteriaSummary: "LVEF ≥ 40% at 6 months. NYHA class improvement by ≥ 1 grade is co-primary.",
    isComposite: false,
    compositeGroupId: null,
  },
  {
    diagnosisCode: "I25",
    conditionName: "Chronic Ischemic Heart Disease — LDL",
    measurementInstrument: "LDL Cholesterol",
    measurementUnit: "mg/dL",
    successOperator: "lt",
    successThreshold: 55,
    timeHorizonDays: 90,
    guidelineSource: "ESC/EAS Dyslipidaemia Guidelines 2019",
    evidenceGrade: "A",
    successCriteriaSummary: "LDL-C < 55 mg/dL for very high risk (established ASCVD). ≥ 50% reduction from baseline.",
    isComposite: false,
    compositeGroupId: null,
  },

  // ── RESPIRATORY ────────────────────────────────────────────────────────────
  {
    diagnosisCode: "J44",
    conditionName: "COPD — FEV1",
    measurementInstrument: "FEV1 % Predicted",
    measurementUnit: "%",
    successOperator: "gte",
    successThreshold: 5.0,
    timeHorizonDays: 90,
    guidelineSource: "GOLD 2024",
    evidenceGrade: "B",
    successCriteriaSummary: "≥ 5% improvement in FEV1 % predicted at 90 days OR CAT score reduction ≥ 2 points.",
    isComposite: false,
    compositeGroupId: null,
  },
  {
    diagnosisCode: "J45",
    conditionName: "Asthma — ACQ Score",
    measurementInstrument: "Asthma Control Questionnaire (ACQ)",
    measurementUnit: "score",
    successOperator: "lte",
    successThreshold: 0.75,
    timeHorizonDays: 30,
    guidelineSource: "GINA 2023",
    evidenceGrade: "A",
    successCriteriaSummary: "ACQ score ≤ 0.75 (well-controlled) at 30 days. ACQ drop ≥ 0.5 is clinically meaningful.",
    isComposite: false,
    compositeGroupId: null,
  },

  // ── MENTAL HEALTH ──────────────────────────────────────────────────────────
  {
    diagnosisCode: "F32",
    conditionName: "Major Depressive Episode",
    measurementInstrument: "PHQ-9",
    measurementUnit: "score",
    successOperator: "drop_by",
    successThreshold: 5.0,
    timeHorizonDays: 42,
    guidelineSource: "APA Practice Guideline for MDD 2010 (updated 2019)",
    evidenceGrade: "A",
    successCriteriaSummary: "PHQ-9 drop ≥ 5 points at 6 weeks (response). Remission = PHQ-9 < 5.",
    isComposite: false,
    compositeGroupId: null,
  },
  {
    diagnosisCode: "F41.1",
    conditionName: "Generalized Anxiety Disorder",
    measurementInstrument: "GAD-7",
    measurementUnit: "score",
    successOperator: "drop_by",
    successThreshold: 4.0,
    timeHorizonDays: 42,
    guidelineSource: "NICE CG113 2011",
    evidenceGrade: "B",
    successCriteriaSummary: "GAD-7 drop ≥ 4 points at 6 weeks (response). Remission = GAD-7 < 5.",
    isComposite: false,
    compositeGroupId: null,
  },
  {
    diagnosisCode: "F20",
    conditionName: "Schizophrenia — PANSS",
    measurementInstrument: "PANSS Total Score",
    measurementUnit: "score",
    successOperator: "drop_by",
    successThreshold: 20.0,
    timeHorizonDays: 42,
    guidelineSource: "APA Schizophrenia Guidelines 2021",
    evidenceGrade: "B",
    successCriteriaSummary: "PANSS total score reduction ≥ 20% at 6 weeks (response threshold).",
    isComposite: false,
    compositeGroupId: null,
  },

  // ── RENAL ──────────────────────────────────────────────────────────────────
  {
    diagnosisCode: "N18",
    conditionName: "Chronic Kidney Disease — eGFR",
    measurementInstrument: "eGFR",
    measurementUnit: "mL/min/1.73m²",
    successOperator: "gte",
    successThreshold: 0.0,
    timeHorizonDays: 90,
    guidelineSource: "KDIGO CKD Guidelines 2022",
    evidenceGrade: "A",
    successCriteriaSummary: "Stabilization of eGFR (no decline > 5 mL/min/1.73m² over 90 days). Urine ACR < 30 mg/g is co-target.",
    isComposite: false,
    compositeGroupId: null,
  },

  // ── MUSCULOSKELETAL ────────────────────────────────────────────────────────
  {
    diagnosisCode: "M79.3",
    conditionName: "Gout — Serum Uric Acid",
    measurementInstrument: "Serum Uric Acid",
    measurementUnit: "mg/dL",
    successOperator: "lt",
    successThreshold: 6.0,
    timeHorizonDays: 90,
    guidelineSource: "ACR Gout Guidelines 2020",
    evidenceGrade: "A",
    successCriteriaSummary: "Serum uric acid < 6.0 mg/dL at 90 days. < 5.0 mg/dL for tophaceous gout.",
    isComposite: false,
    compositeGroupId: null,
  },
  {
    diagnosisCode: "M05",
    conditionName: "Rheumatoid Arthritis — DAS28",
    measurementInstrument: "DAS28-CRP",
    measurementUnit: "score",
    successOperator: "lt",
    successThreshold: 2.6,
    timeHorizonDays: 90,
    guidelineSource: "ACR/EULAR RA Guidelines 2021",
    evidenceGrade: "A",
    successCriteriaSummary: "DAS28-CRP < 2.6 (remission) at 90 days. Low disease activity = DAS28 < 3.2.",
    isComposite: false,
    compositeGroupId: null,
  },

  // ── INFECTIOUS DISEASE ─────────────────────────────────────────────────────
  {
    diagnosisCode: "B20",
    conditionName: "HIV Disease — Viral Load",
    measurementInstrument: "HIV-1 RNA Viral Load",
    measurementUnit: "copies/mL",
    successOperator: "lt",
    successThreshold: 50,
    timeHorizonDays: 180,
    guidelineSource: "DHHS HIV Guidelines 2023",
    evidenceGrade: "A",
    successCriteriaSummary: "HIV-1 RNA < 50 copies/mL (undetectable) at 6 months on ART.",
    isComposite: false,
    compositeGroupId: null,
  },
  {
    diagnosisCode: "K74",
    conditionName: "Liver Cirrhosis — Hepatic Encephalopathy",
    measurementInstrument: "West Haven Grade",
    measurementUnit: "grade",
    successOperator: "lte",
    successThreshold: 1.0,
    timeHorizonDays: 30,
    guidelineSource: "AASLD Practice Guidance 2021",
    evidenceGrade: "B",
    successCriteriaSummary: "West Haven grade ≤ 1 (minimal or no encephalopathy) at 30 days.",
    isComposite: false,
    compositeGroupId: null,
  },

  // ── PAIN / FUNCTIONAL ──────────────────────────────────────────────────────
  {
    diagnosisCode: "M54.5",
    conditionName: "Low Back Pain",
    measurementInstrument: "Numeric Pain Rating Scale (NRS)",
    measurementUnit: "score",
    successOperator: "drop_by",
    successThreshold: 2.0,
    timeHorizonDays: 30,
    guidelineSource: "ACP Low Back Pain Guidelines 2017",
    evidenceGrade: "B",
    successCriteriaSummary: "NRS pain score reduction ≥ 2 points at 30 days (MCID). ODI functional improvement ≥ 10 points co-target.",
    isComposite: false,
    compositeGroupId: null,
  },
  {
    diagnosisCode: "G43",
    conditionName: "Migraine — Monthly Headache Days",
    measurementInstrument: "Monthly Headache Days",
    measurementUnit: "days/month",
    successOperator: "drop_by",
    successThreshold: 4.0,
    timeHorizonDays: 90,
    guidelineSource: "AAN/AHS Migraine Prevention Guidelines 2012 (updated 2019)",
    evidenceGrade: "A",
    successCriteriaSummary: "Reduction ≥ 4 headache days/month at 90 days (standard preventive trial endpoint).",
    isComposite: false,
    compositeGroupId: null,
  },

  // ── THYROID ────────────────────────────────────────────────────────────────
  {
    diagnosisCode: "E05",
    conditionName: "Hyperthyroidism — TSH",
    measurementInstrument: "TSH",
    measurementUnit: "mIU/L",
    successOperator: "gte",
    successThreshold: 0.4,
    timeHorizonDays: 60,
    guidelineSource: "ATA Hyperthyroidism Guidelines 2016",
    evidenceGrade: "B",
    successCriteriaSummary: "TSH ≥ 0.4 mIU/L (within normal range 0.4–4.0) at 60 days.",
    isComposite: false,
    compositeGroupId: null,
  },
  {
    diagnosisCode: "E03",
    conditionName: "Hypothyroidism — TSH",
    measurementInstrument: "TSH",
    measurementUnit: "mIU/L",
    successOperator: "lte",
    successThreshold: 4.0,
    timeHorizonDays: 60,
    guidelineSource: "ATA Hypothyroidism Guidelines 2014",
    evidenceGrade: "A",
    successCriteriaSummary: "TSH 0.4–4.0 mIU/L at 60 days. Target 0.5–2.5 mIU/L for younger patients.",
    isComposite: false,
    compositeGroupId: null,
  },

  // ── ONCOLOGY ───────────────────────────────────────────────────────────────
  {
    diagnosisCode: "C50",
    conditionName: "Breast Cancer — Tumor Response",
    measurementInstrument: "RECIST 1.1 Response",
    measurementUnit: "category",
    successOperator: "reach",
    successThreshold: 1.0,
    timeHorizonDays: 90,
    guidelineSource: "RECIST 1.1 / NCCN Breast Cancer 2023",
    evidenceGrade: "A",
    successCriteriaSummary: "Partial or complete response (RECIST 1.1) at first imaging reassessment (~90 days). 1 = PR/CR, 0 = SD/PD.",
    isComposite: false,
    compositeGroupId: null,
  },
];

async function seed() {
  const conn = await createConnection(DATABASE_URL);
  console.log(`Seeding ${definitions.length} outcome definitions...`);

  let inserted = 0;
  let skipped = 0;

  for (const def of definitions) {
    // Check if this exact diagnosisCode + measurementInstrument already exists
    const [existing] = await conn.execute(
      "SELECT id FROM outcome_definitions WHERE diagnosisCode = ? AND measurementInstrument = ? LIMIT 1",
      [def.diagnosisCode, def.measurementInstrument]
    );
    if (existing.length > 0) {
      skipped++;
      continue;
    }

    await conn.execute(
      `INSERT INTO outcome_definitions
        (diagnosisCode, conditionName, measurementInstrument, measurementUnit,
         successOperator, successThreshold, timeHorizonDays,
         guidelineSource, evidenceGrade, successCriteriaSummary,
         isComposite, compositeGroupId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        def.diagnosisCode,
        def.conditionName,
        def.measurementInstrument,
        def.measurementUnit ?? null,
        def.successOperator,
        def.successThreshold,
        def.timeHorizonDays,
        def.guidelineSource,
        def.evidenceGrade,
        def.successCriteriaSummary,
        def.isComposite ? 1 : 0,
        def.compositeGroupId ?? null,
      ]
    );
    inserted++;
    console.log(`  ✓ ${def.diagnosisCode} — ${def.measurementInstrument}`);
  }

  await conn.end();
  console.log(`\nDone. Inserted: ${inserted} | Skipped (already exist): ${skipped}`);
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
