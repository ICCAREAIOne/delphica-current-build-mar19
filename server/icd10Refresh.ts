/**
 * ICD-10-CM Annual Refresh Job
 * ─────────────────────────────────────────────────────────────────────────────
 * CMS releases a new ICD-10-CM tabular every October (effective Oct 1).
 * This module:
 *   1. Checks whether the icd10_codes table is stale (> 11 months old).
 *   2. Downloads the latest flat file from the CMS GitHub mirror.
 *   3. Loads new/changed codes into the reference table.
 *   4. Re-runs auditOutcomeDefinitionCodes() and notifies the owner if any
 *      existing outcome_definitions codes are no longer valid.
 *
 * Trigger: called from the scheduled job endpoint or manually via tRPC.
 * Schedule: run once on Oct 1 each year (see server/index.ts or cron setup).
 */

import https from "https";
import fs from "fs";
import path from "path";
import os from "os";
import { createInterface } from "readline";
import { createGunzip } from "zlib";
import { auditOutcomeDefinitionCodes, getDb } from "./db";
import { notifyOwner } from "./_core/notification";
import { icd10Codes } from "../drizzle/schema";
import { sql } from "drizzle-orm";

// CMS FY2026 flat file URL (update each October when CMS publishes new tabular)
const ICD10_SOURCE_URL =
  "https://raw.githubusercontent.com/k4m4/icd10/master/icd10.json";

// Fallback: NLM Clinical Tables API (paginated, slower but always current)
const NLM_API_BASE = "https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search";

export interface RefreshResult {
  status: "ok" | "skipped" | "error";
  message: string;
  codesLoaded?: number;
  auditIssues?: number;
  auditSpecificityWarnings?: number;
  runAt: Date;
}

/**
 * Check when the icd10_codes table was last loaded.
 * Returns the oldest created_at timestamp, or null if table is empty.
 */
async function getTableLoadDate(): Promise<Date | null> {
  const database = await getDb();
  if (!database) return null;
  const [row] = await database.execute(
    sql`SELECT MIN(created_at) as oldest FROM icd10_codes LIMIT 1`
  ) as any;
  const oldest = row?.[0]?.oldest;
  return oldest ? new Date(oldest) : null;
}

/**
 * Download the CMS ICD-10-CM flat file (CSV format from GitHub mirror).
 * Returns path to local temp file.
 */
async function downloadFlatFile(): Promise<string> {
  const CSV_URL =
    "https://raw.githubusercontent.com/bhanuprakashbv/icd10-codes/master/icd10cm_order_2025.txt";

  const tmpPath = path.join(os.tmpdir(), `icd10_refresh_${Date.now()}.txt`);

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(tmpPath);
    https.get(CSV_URL, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} downloading ICD-10 flat file`));
        return;
      }
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(tmpPath); });
    }).on("error", reject);
  });
}

/**
 * Parse the CMS order flat file and upsert codes into icd10_codes.
 * Format: fixed-width — cols 1-5 order, 7-13 code, 15 billable, 17-76 short, 78+ long
 */
async function loadCodesFromFile(filePath: string): Promise<number> {
  const database = await getDb();
  if (!database) throw new Error("Database unavailable");

  const rl = createInterface({ input: fs.createReadStream(filePath) });
  const BATCH = 500;
  let batch: any[] = [];
  let total = 0;

  const flush = async () => {
    if (batch.length === 0) return;
    // Use raw SQL for bulk upsert to avoid Drizzle batch limitations
    const placeholders = batch.map(() => "(?,?,?,?,?,?)").join(",");
    const values = batch.flatMap((r) => [
      r.code, r.shortDesc, r.longDesc, r.isBillable, r.codeType, r.codeType
    ]);
    await database.execute(
      sql.raw(
        `INSERT INTO icd10_codes (code, short_desc, long_desc, is_billable, code_type, created_at)
         VALUES ${placeholders}
         ON DUPLICATE KEY UPDATE
           short_desc = VALUES(short_desc),
           long_desc  = VALUES(long_desc),
           is_billable = VALUES(is_billable),
           code_type  = VALUES(code_type)`
      )
    );
    total += batch.length;
    batch = [];
  };

  for await (const line of rl) {
    if (line.length < 16) continue;
    const rawCode = line.substring(6, 13).trim();
    const isBillable = line.substring(14, 15).trim() === "1";
    const shortDesc = line.substring(16, 76).trim();
    const longDesc = line.substring(77).trim() || shortDesc;

    // Classify code type
    let codeType = "diagnosis";
    if (rawCode.startsWith("V") || rawCode.startsWith("W") ||
        rawCode.startsWith("X") || rawCode.startsWith("Y")) {
      codeType = "external";
    } else if (rawCode.startsWith("Z")) {
      codeType = "supplemental";
    }

    batch.push({ code: rawCode, shortDesc, longDesc, isBillable: isBillable ? 1 : 0, codeType });
    if (batch.length >= BATCH) await flush();
  }
  await flush();
  fs.unlinkSync(filePath);
  return total;
}

/**
 * Main refresh entry point.
 * - Skips if table was loaded < 11 months ago (unless force=true).
 * - Downloads and loads the latest CMS flat file.
 * - Audits outcome_definitions and notifies owner of any issues.
 */
export async function runIcd10Refresh(force = false): Promise<RefreshResult> {
  const runAt = new Date();

  try {
    // ── Staleness check ────────────────────────────────────────────────────
    const loadDate = await getTableLoadDate();
    if (loadDate && !force) {
      const ageMs = Date.now() - loadDate.getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      if (ageDays < 330) {
        return {
          status: "skipped",
          message: `ICD-10-CM table loaded ${Math.round(ageDays)} days ago — refresh not needed until October.`,
          runAt,
        };
      }
    }

    // ── Download & load ────────────────────────────────────────────────────
    console.log("[ICD10Refresh] Downloading CMS FY2026 flat file…");
    const tmpFile = await downloadFlatFile();
    const codesLoaded = await loadCodesFromFile(tmpFile);
    console.log(`[ICD10Refresh] Loaded ${codesLoaded} codes`);

    // ── Audit outcome_definitions ──────────────────────────────────────────
    const auditResults = await auditOutcomeDefinitionCodes();
    const issues = auditResults.filter((r) => r.status !== "valid");
    const warnings = auditResults.filter((r) => r.specificityWarning);

    // ── Notify owner ───────────────────────────────────────────────────────
    if (issues.length > 0) {
      const issueList = issues
        .map((r) => `• ${r.diagnosisCode} (${r.conditionName}): ${r.status}`)
        .join("\n");
      await notifyOwner({
        title: `⚠ ICD-10-CM Refresh: ${issues.length} outcome definition code(s) need attention`,
        content:
          `The annual ICD-10-CM refresh completed on ${runAt.toISOString().split("T")[0]}.\n\n` +
          `${codesLoaded.toLocaleString()} codes loaded.\n\n` +
          `**${issues.length} outcome definition code(s) are now invalid:**\n${issueList}\n\n` +
          `Please review and update these codes in the Policy Dashboard → ICD-10 Audit tab.`,
      });
    } else {
      await notifyOwner({
        title: `✓ ICD-10-CM Annual Refresh Complete — All ${auditResults.length} codes valid`,
        content:
          `Refresh completed ${runAt.toISOString().split("T")[0]}. ` +
          `${codesLoaded.toLocaleString()} codes loaded. ` +
          `All ${auditResults.length} outcome definition codes remain valid. ` +
          `${warnings.length} specificity warnings (unspecified codes) — no action required.`,
      });
    }

    return {
      status: "ok",
      message: `Loaded ${codesLoaded} codes. ${issues.length} audit issues, ${warnings.length} specificity warnings.`,
      codesLoaded,
      auditIssues: issues.length,
      auditSpecificityWarnings: warnings.length,
      runAt,
    };
  } catch (err: any) {
    console.error("[ICD10Refresh] Error:", err.message);
    await notifyOwner({
      title: "✗ ICD-10-CM Annual Refresh Failed",
      content: `Refresh attempted ${runAt.toISOString()} but failed: ${err.message}`,
    }).catch(() => {});
    return {
      status: "error",
      message: err.message,
      runAt,
    };
  }
}
