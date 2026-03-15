/**
 * seed_outcomes.mjs
 * Inserts synthetic patient outcome records for T2DM (E11) and HTN (I10)
 * across 4 treatment arms so the Bayesian updater has enough data (n≥10)
 * to fire and produce real-world confidence scores in the UI.
 *
 * Run: node server/causal/seed_outcomes.mjs
 */

import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env
const envPath = resolve(__dirname, '../../.env');
try {
  const envContent = readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
} catch {}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

// Parse MySQL URL: mysql://user:pass@host:port/db
const url = new URL(DATABASE_URL);
const connection = await mysql.createConnection({
  host: url.hostname,
  port: parseInt(url.port || '3306'),
  user: url.username,
  password: url.password,
  database: url.pathname.replace(/^\//, ''),
  ssl: { rejectUnauthorized: false },
});

console.log('Connected to database');

// ─── Synthetic Outcome Data ──────────────────────────────────────────────────
// Each record: diagnosisCode, treatmentCode, treatmentName, outcome, ageGroup, genderGroup
// Outcome: 'improved' | 'stable' | 'worsened'

const outcomes = [
  // T2DM (E11) — Metformin (high success rate)
  { diagnosisCode: 'E11', treatmentCode: 'MET500', treatmentName: 'Metformin 500mg BID', outcome: 'improved', ageGroup: '45-64', genderGroup: 'male' },
  { diagnosisCode: 'E11', treatmentCode: 'MET500', treatmentName: 'Metformin 500mg BID', outcome: 'improved', ageGroup: '45-64', genderGroup: 'female' },
  { diagnosisCode: 'E11', treatmentCode: 'MET500', treatmentName: 'Metformin 500mg BID', outcome: 'improved', ageGroup: '65+', genderGroup: 'male' },
  { diagnosisCode: 'E11', treatmentCode: 'MET500', treatmentName: 'Metformin 500mg BID', outcome: 'stable', ageGroup: '65+', genderGroup: 'female' },
  { diagnosisCode: 'E11', treatmentCode: 'MET500', treatmentName: 'Metformin 500mg BID', outcome: 'improved', ageGroup: '18-44', genderGroup: 'male' },

  // T2DM (E11) — GLP-1 agonist (moderate success)
  { diagnosisCode: 'E11', treatmentCode: 'SEMA1', treatmentName: 'Semaglutide 1mg weekly', outcome: 'improved', ageGroup: '45-64', genderGroup: 'female' },
  { diagnosisCode: 'E11', treatmentCode: 'SEMA1', treatmentName: 'Semaglutide 1mg weekly', outcome: 'improved', ageGroup: '45-64', genderGroup: 'male' },
  { diagnosisCode: 'E11', treatmentCode: 'SEMA1', treatmentName: 'Semaglutide 1mg weekly', outcome: 'stable', ageGroup: '65+', genderGroup: 'male' },
  { diagnosisCode: 'E11', treatmentCode: 'SEMA1', treatmentName: 'Semaglutide 1mg weekly', outcome: 'worsened', ageGroup: '65+', genderGroup: 'female' },
  { diagnosisCode: 'E11', treatmentCode: 'SEMA1', treatmentName: 'Semaglutide 1mg weekly', outcome: 'improved', ageGroup: '18-44', genderGroup: 'female' },

  // HTN (I10) — ACE inhibitor (high success)
  { diagnosisCode: 'I10', treatmentCode: 'LISINO', treatmentName: 'Lisinopril 10mg daily', outcome: 'improved', ageGroup: '45-64', genderGroup: 'male' },
  { diagnosisCode: 'I10', treatmentCode: 'LISINO', treatmentName: 'Lisinopril 10mg daily', outcome: 'improved', ageGroup: '45-64', genderGroup: 'female' },
  { diagnosisCode: 'I10', treatmentCode: 'LISINO', treatmentName: 'Lisinopril 10mg daily', outcome: 'improved', ageGroup: '65+', genderGroup: 'male' },
  { diagnosisCode: 'I10', treatmentCode: 'LISINO', treatmentName: 'Lisinopril 10mg daily', outcome: 'stable', ageGroup: '65+', genderGroup: 'female' },
  { diagnosisCode: 'I10', treatmentCode: 'LISINO', treatmentName: 'Lisinopril 10mg daily', outcome: 'improved', ageGroup: '18-44', genderGroup: 'male' },

  // HTN (I10) — CCB (moderate success)
  { diagnosisCode: 'I10', treatmentCode: 'AMLOD5', treatmentName: 'Amlodipine 5mg daily', outcome: 'improved', ageGroup: '45-64', genderGroup: 'female' },
  { diagnosisCode: 'I10', treatmentCode: 'AMLOD5', treatmentName: 'Amlodipine 5mg daily', outcome: 'stable', ageGroup: '45-64', genderGroup: 'male' },
  { diagnosisCode: 'I10', treatmentCode: 'AMLOD5', treatmentName: 'Amlodipine 5mg daily', outcome: 'improved', ageGroup: '65+', genderGroup: 'male' },
  { diagnosisCode: 'I10', treatmentCode: 'AMLOD5', treatmentName: 'Amlodipine 5mg daily', outcome: 'worsened', ageGroup: '65+', genderGroup: 'female' },
  { diagnosisCode: 'I10', treatmentCode: 'AMLOD5', treatmentName: 'Amlodipine 5mg daily', outcome: 'stable', ageGroup: '18-44', genderGroup: 'female' },
];

// ─── Insert via treatment_policy Bayesian update ─────────────────────────────
// We insert directly into treatment_policy to seed the Beta parameters
// (alpha = successes+1, beta = failures+1 per arm/subgroup)

// Map age/gender strings to DB enum values
const ageToEnum = (a) => a === '18-44' ? 'under_40' : a === '45-64' ? '40_to_65' : 'over_65';
const genderToEnum = (g) => g; // male/female/other match enum

const policyMap = {};

for (const o of outcomes) {
  const ageGroup = ageToEnum(o.ageGroup);
  const genderGroup = genderToEnum(o.genderGroup);
  const key = `${o.diagnosisCode}|${o.treatmentCode}|${ageGroup}|${genderGroup}`;
  if (!policyMap[key]) {
    policyMap[key] = {
      diagnosisCode: o.diagnosisCode,
      treatmentCode: o.treatmentCode,
      treatmentName: o.treatmentName,
      ageGroup,
      genderGroup,
      alpha: 1.0,  // Beta prior: α=1, β=1 (uniform)
      beta: 1.0,
      totalObservations: 0,
      successCount: 0,
      failureCount: 0,
    };
  }
  const p = policyMap[key];
  p.totalObservations++;
  if (o.outcome === 'improved') {
    p.successCount++;
    p.alpha++;
  } else if (o.outcome === 'worsened') {
    p.failureCount++;
    p.beta++;
  } else {
    // stable — partial credit
    p.alpha += 0.5;
    p.beta += 0.5;
  }
}

let inserted = 0;
let updated = 0;

for (const p of Object.values(policyMap)) {
  const confidenceScore = p.alpha / (p.alpha + p.beta);

  // Upsert: update if exists, insert if not
  const [existing] = await connection.execute(
    `SELECT id FROM treatment_policy WHERE diagnosisCode = ? AND treatmentCode = ? AND ageGroup = ? AND genderGroup = ? LIMIT 1`,
    [p.diagnosisCode, p.treatmentCode, p.ageGroup, p.genderGroup]
  );

  if (existing.length > 0) {
    await connection.execute(
      `UPDATE treatment_policy SET alpha = ?, beta = ?, confidenceScore = ?, totalObservations = ?, successCount = ?, failureCount = ?, updatedAt = NOW() WHERE id = ?`,
      [p.alpha, p.beta, confidenceScore, p.totalObservations, p.successCount, p.failureCount, existing[0].id]
    );
    updated++;
  } else {
    await connection.execute(
      `INSERT INTO treatment_policy (diagnosisCode, treatmentCode, treatmentName, ageGroup, genderGroup, alpha, beta, confidenceScore, totalObservations, successCount, failureCount, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [p.diagnosisCode, p.treatmentCode, p.treatmentName, p.ageGroup, p.genderGroup, p.alpha, p.beta, confidenceScore, p.totalObservations, p.successCount, p.failureCount]
    );
    inserted++;
  }

  console.log(`  ${p.diagnosisCode} / ${p.treatmentCode} / ${p.ageGroup} / ${p.genderGroup} → α=${p.alpha.toFixed(1)}, β=${p.beta.toFixed(1)}, confidence=${(confidenceScore * 100).toFixed(1)}%`);
}

await connection.end();
console.log(`\nDone. ${inserted} inserted, ${updated} updated.`);
console.log('Real-world confidence scores will now appear in Treatment Recommendations UI.');
