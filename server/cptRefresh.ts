/**
 * cptRefresh.ts
 *
 * Annual CPT-4 reference table refresh job.
 * Mirrors the icd10Refresh.ts pattern:
 *  - Skips if table was loaded < 11 months ago (unless force=true)
 *  - Downloads the latest public CPT-4 CSV from the canonical GitHub source
 *  - Bulk-upserts into cpt_codes
 *  - Runs auditTreatmentEntryCPTCodes() and notifies owner of any issues
 *  - Schedules itself to run every October 1st (CMS annual release cycle)
 *
 * CPT is AMA-proprietary; the public dataset used here is the
 * 8,222-code subset published at:
 *   https://gist.github.com/lieldulev/439793dc3c5a6613b661c33d71fdd185
 * For the full licensed set, replace CPT_CSV_URL with your AMA-licensed feed.
 */

import * as fs from "fs";
import * as https from "https";
import * as readline from "readline";
import * as path from "path";
import * as os from "os";
import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { auditTreatmentEntryCPTCodes } from "./db";
import { notifyOwner } from "./_core/notification";

// ─── Constants ────────────────────────────────────────────────────────────────

const CPT_CSV_URL =
  "https://gist.githubusercontent.com/lieldulev/439793dc3c5a6613b661c33d71fdd185/raw/cpt4.csv";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CptRefreshResult = {
  status: "ok" | "skipped" | "error";
  message: string;
  codesLoaded?: number;
  auditIssues?: number;
  runAt: Date;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getTableLoadDate(): Promise<Date | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const rows = await db.execute(
      sql.raw(`SELECT MIN(created_at) AS loaded_at FROM cpt_codes LIMIT 1`)
    ) as any;
    const row = rows[0]?.[0];
    return row?.loaded_at ? new Date(row.loaded_at) : null;
  } catch {
    return null;
  }
}

function downloadCsvFile(): Promise<string> {
  return new Promise((resolve, reject) => {
    const tmpPath = path.join(os.tmpdir(), `cpt_refresh_${Date.now()}.csv`);
    const file = fs.createWriteStream(tmpPath);
    https
      .get(CPT_CSV_URL, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`CPT CSV download failed: HTTP ${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve(tmpPath);
        });
      })
      .on("error", (err) => {
        fs.unlink(tmpPath, () => {});
        reject(err);
      });
  });
}

async function loadCodesFromCsv(filePath: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rl = readline.createInterface({ input: fs.createReadStream(filePath) });
  const BATCH = 500;
  let batch: { code: string; description: string; category: string }[] = [];
  let total = 0;
  let headerSkipped = false;

  const flush = async () => {
    if (batch.length === 0) return;
    const placeholders = batch.map(() => "(?,?,?,NOW())").join(",");
    const values = batch.flatMap((r) => [r.code, r.description, r.category]);
    await db.execute(
      sql.raw(
        `INSERT INTO cpt_codes (code, description, category, created_at)
         VALUES ${placeholders}
         ON DUPLICATE KEY UPDATE
           description = VALUES(description),
           category    = VALUES(category)`
      )
    );
    total += batch.length;
    batch = [];
  };

  for await (const line of rl) {
    // Skip CSV header row
    if (!headerSkipped) {
      headerSkipped = true;
      continue;
    }
    const trimmed = line.trim();
    if (!trimmed) continue;

    // CSV format: code,label  (may be quoted)
    const commaIdx = trimmed.indexOf(",");
    if (commaIdx === -1) continue;
    const code = trimmed.substring(0, commaIdx).trim().replace(/^"|"$/g, "");
    const description = trimmed.substring(commaIdx + 1).trim().replace(/^"|"$/g, "");
    if (!code || !description) continue;

    // Derive category from CPT numeric range
    const codeNum = parseInt(code, 10);
    let category = "Other";
    if (codeNum >= 99201 && codeNum <= 99499) category = "Evaluation and Management";
    else if (codeNum >= 10004 && codeNum <= 69990) category = "Surgery";
    else if (codeNum >= 70010 && codeNum <= 79999) category = "Radiology";
    else if (codeNum >= 80047 && codeNum <= 89398) category = "Pathology and Laboratory";
    else if (codeNum >= 90281 && codeNum <= 99199) category = "Medicine";
    else if (codeNum >= 99500 && codeNum <= 99607) category = "Category III";
    else if (code.startsWith("0") && codeNum < 10000) category = "Anesthesia";

    batch.push({ code, description, category });
    if (batch.length >= BATCH) await flush();
  }
  await flush();
  fs.unlinkSync(filePath);
  return total;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Run the CPT refresh.
 * - force=true bypasses the staleness check (for manual UI-triggered refreshes).
 */
export async function runCptRefresh(force = false): Promise<CptRefreshResult> {
  const runAt = new Date();
  try {
    // ── Staleness check ────────────────────────────────────────────────────
    const loadDate = await getTableLoadDate();
    if (loadDate && !force) {
      const ageDays = (Date.now() - loadDate.getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays < 330) {
        return {
          status: "skipped",
          message: `CPT table loaded ${Math.round(ageDays)} days ago — refresh not needed until October.`,
          runAt,
        };
      }
    }

    // ── Download & load ────────────────────────────────────────────────────
    console.log("[CptRefresh] Downloading CPT-4 CSV…");
    const tmpFile = await downloadCsvFile();
    const codesLoaded = await loadCodesFromCsv(tmpFile);
    console.log(`[CptRefresh] Loaded ${codesLoaded} codes`);

    // ── Audit treatment entries ────────────────────────────────────────────
    const auditResults = await auditTreatmentEntryCPTCodes();
    const issues = auditResults.filter((r) => !r.valid);

    // ── Notify owner ───────────────────────────────────────────────────────
    if (issues.length > 0) {
      const issueList = issues
        .map((r) => `• Entry #${r.treatmentEntryId} — CPT ${r.cptCode}: ${r.reason ?? "not found"}`)
        .join("\n");
      await notifyOwner({
        title: `⚠ CPT Refresh: ${issues.length} treatment entr${issues.length === 1 ? "y" : "ies"} with invalid CPT code(s)`,
        content:
          `The annual CPT-4 refresh completed on ${runAt.toISOString().split("T")[0]}.\n\n` +
          `${codesLoaded.toLocaleString()} codes loaded.\n\n` +
          `**${issues.length} treatment entr${issues.length === 1 ? "y" : "ies"} with invalid CPT codes:**\n${issueList}\n\n` +
          `Please review in the Policy Dashboard → CPT Audit tab.`,
      });
    } else {
      await notifyOwner({
        title: `✓ CPT Annual Refresh Complete — ${auditResults.length} entries validated`,
        content:
          `CPT refresh completed ${runAt.toISOString().split("T")[0]}. ` +
          `${codesLoaded.toLocaleString()} codes loaded. ` +
          `All ${auditResults.length} treatment entry CPT codes are valid.`,
      });
    }

    return {
      status: "ok",
      message: `Loaded ${codesLoaded} codes. ${issues.length} audit issues.`,
      codesLoaded,
      auditIssues: issues.length,
      runAt,
    };
  } catch (err: any) {
    console.error("[CptRefresh] Error:", err.message);
    await notifyOwner({
      title: "✗ CPT Annual Refresh Failed",
      content: `CPT refresh attempted ${runAt.toISOString()} but failed: ${err.message}`,
    }).catch(() => {});
    return {
      status: "error",
      message: err.message,
      runAt,
    };
  }
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

/**
 * Schedule the CPT refresh to run every October 1st at 03:00 UTC.
 * CMS releases the annual CPT update in October.
 * Call this once from server/index.ts at startup.
 */
export function scheduleCptRefresh(): void {
  const now = new Date();
  const nextOct1 = new Date(Date.UTC(now.getUTCFullYear(), 9, 1, 3, 0, 0));
  if (nextOct1 <= now) {
    nextOct1.setUTCFullYear(nextOct1.getUTCFullYear() + 1);
  }
  const msUntilFirst = nextOct1.getTime() - now.getTime();
  const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

  setTimeout(() => {
    runCptRefresh().catch((err) =>
      console.error("[CptRefresh] Scheduled run failed:", err)
    );
    setInterval(() => {
      runCptRefresh().catch((err) =>
        console.error("[CptRefresh] Scheduled run failed:", err)
      );
    }, MS_PER_YEAR);
  }, msUntilFirst);

  const daysUntil = Math.round(msUntilFirst / (1000 * 60 * 60 * 24));
  console.log(`[CptRefresh] Scheduled — next run in ${daysUntil} days (Oct 1 UTC)`);
}
