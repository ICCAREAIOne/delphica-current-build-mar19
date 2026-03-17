import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Check NOT NULL columns in causal_analyses
const [cols] = await conn.execute('DESCRIBE causal_analyses');
console.log('NOT NULL no-default cols:');
for (const c of cols) {
  if (c.Null === 'NO' && c.Default === null && c.Field !== 'id') {
    console.log(' ', c.Field);
  }
}

// Fix: make diagnosisName and treatmentName nullable (they were added by the earlier migration)
// These are extra columns not in the Drizzle schema — just make them nullable
try {
  await conn.execute("ALTER TABLE causal_analyses MODIFY COLUMN diagnosisName VARCHAR(255) NULL");
  console.log('Fixed: diagnosisName now nullable');
} catch(e) { console.log('diagnosisName already nullable or error:', e.message); }

try {
  await conn.execute("ALTER TABLE causal_analyses MODIFY COLUMN treatmentName VARCHAR(255) NULL");
  console.log('Fixed: treatmentName now nullable');
} catch(e) { console.log('treatmentName already nullable or error:', e.message); }

// Also fix evidenceLevel (NOT NULL from old schema)
try {
  await conn.execute("ALTER TABLE causal_analyses MODIFY COLUMN evidenceLevel VARCHAR(64) NULL");
  console.log('Fixed: evidenceLevel now nullable');
} catch(e) { console.log('evidenceLevel already nullable or error:', e.message); }

// Check diagnosis_entries table for generateRecommendations
const [de] = await conn.execute('DESCRIBE diagnosis_entries');
console.log('\ndiagnosis_entries cols:', de.map(c => c.Field).join(', '));
const [deRows] = await conn.execute('SELECT COUNT(*) as cnt FROM diagnosis_entries');
console.log('diagnosis_entries rows:', deRows[0].cnt);

// Check clinical_sessions
const [cs] = await conn.execute('SELECT id, patientId, physicianId FROM clinical_sessions LIMIT 3');
console.log('clinical_sessions:', JSON.stringify(cs));

await conn.end();
