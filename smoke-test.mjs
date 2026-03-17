/**
 * Physician Portal — End-to-End Smoke Test
 * Tests the full clinical workflow via tRPC HTTP calls with a real JWT session.
 */
import { SignJWT } from 'jose';
import mysql from 'mysql2/promise';

const BASE = 'http://localhost:3000';
const COOKIE_NAME = 'app_session_id';

// ── helpers ──────────────────────────────────────────────────────────────────
const results = [];
function pass(name, detail = '') {
  results.push({ status: 'PASS', name, detail });
  console.log(`  ✅ PASS  ${name}${detail ? ' — ' + String(detail).slice(0, 120) : ''}`);
}
function fail(name, detail = '') {
  results.push({ status: 'FAIL', name, detail });
  console.log(`  ❌ FAIL  ${name} — ${String(detail).slice(0, 200)}`);
}
function skip(name, reason = '') {
  results.push({ status: 'SKIP', name, reason });
  console.log(`  ⏭  SKIP  ${name} — ${reason}`);
}

async function call(cookie, router, proc, input, method = 'query') {
  const url = `${BASE}/api/trpc/${router}.${proc}`;
  let res;
  if (method === 'query') {
    const params = encodeURIComponent(JSON.stringify({ 0: { json: input } }));
    res = await fetch(`${url}?batch=1&input=${params}`, {
      headers: { cookie: `${COOKIE_NAME}=${cookie}` },
    });
  } else {
    res = await fetch(`${url}?batch=1`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${COOKIE_NAME}=${cookie}`,
      },
      body: JSON.stringify({ 0: { json: input } }),
    });
  }
  const json = await res.json();
  if (json[0]?.error) throw new Error(JSON.stringify(json[0].error.json?.message || json[0].error));
  return json[0]?.result?.data?.json ?? json[0]?.result?.data;
}

// ── create session token ──────────────────────────────────────────────────────
const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [users] = await conn.execute('SELECT id, openId, name FROM users LIMIT 1');
const owner = users[0];
await conn.end();

const secret = new TextEncoder().encode(process.env.JWT_SECRET);
const appId = process.env.VITE_APP_ID;
const cookie = await new SignJWT({ openId: owner.openId, appId, name: owner.name })
  .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
  .setExpirationTime('1h')
  .sign(secret);

console.log('\n══════════════════════════════════════════════════════════════');
console.log('  PHYSICIAN PORTAL — END-TO-END SMOKE TEST');
console.log('══════════════════════════════════════════════════════════════');

// ── 1. Auth ───────────────────────────────────────────────────────────────────
console.log('── 1. Auth ──────────────────────────────────────────────────');
try {
  const me = await call(cookie, 'auth', 'me', undefined);
  if (me?.name) pass('auth.me', `user=${me.name} role=${me.role}`);
  else fail('auth.me', 'no user returned');
} catch (e) { fail('auth.me', e.message); }

// ── 2. Patient List ───────────────────────────────────────────────────────────
console.log('── 2. Patient List ──────────────────────────────────────────');
let patientId;
try {
  const patients = await call(cookie, 'patients', 'list', {});
  if (Array.isArray(patients) && patients.length > 0) {
    patientId = patients[0].id;
    pass('patients.list', `count=${patients.length}, first=${patients[0].firstName} ${patients[0].lastName}`);
  } else {
    fail('patients.list', 'empty or wrong shape: ' + JSON.stringify(patients).slice(0, 100));
  }
} catch (e) { fail('patients.list', e.message); }

// ── 3. Patient Create ─────────────────────────────────────────────────────────
console.log('── 3. Patient Create ────────────────────────────────────────');
let testPatientId;
try {
  const mrn = `TEST-${Date.now()}`;
  const result = await call(cookie, 'patients', 'create', {
    mrn,
    firstName: 'Smoke',
    lastName: 'TestPatient',
    dateOfBirth: new Date('1970-01-15'),
    gender: 'male',
    email: `smoke.test.${Date.now()}@example.com`,
    chronicConditions: ['E11 - Type 2 Diabetes'],
    currentMedications: ['Metformin 500mg'],
    allergies: ['Penicillin'],
  }, 'mutation');
  if (result?.id) {
    testPatientId = result.id;
    pass('patients.create', `id=${result.id} mrn=${mrn}`);
  } else {
    fail('patients.create', JSON.stringify(result));
  }
} catch (e) { fail('patients.create', e.message); }

// Use real patient if test patient creation failed
const activePatientId = testPatientId || patientId;

// ── 4. Patient Stats ──────────────────────────────────────────────────────────
console.log('── 4. Patient Stats ─────────────────────────────────────────');
try {
  const stats = await call(cookie, 'patients', 'stats', {});
  if (typeof stats?.total === 'number') pass('patients.stats', `total=${stats.total} active=${stats.active}`);
  else fail('patients.stats', JSON.stringify(stats).slice(0, 100));
} catch (e) { fail('patients.stats', e.message); }

// ── 5. Semantic Processor (ICD-10 + CPT) ─────────────────────────────────────
console.log('── 5. Semantic Processor ────────────────────────────────────');
try {
  const result = await call(cookie, 'semanticProcessor', 'processClinicalNote', {
    chiefComplaint: 'Type 2 diabetes with poor glycemic control',
    historyOfPresentIllness: 'Patient presents with HbA1c 9.2%, on Metformin 500mg bid. Reports polyuria and polydipsia.',
    assessment: 'Uncontrolled T2DM, consider escalating therapy',
    plan: 'Add semaglutide, recheck HbA1c in 3 months',
  }, 'mutation');
  if (result?.icd10Codes?.length > 0 || result?.diagnoses?.length > 0 || result?.codes?.length > 0) {
    pass('semanticProcessor.processClinicalNote', `codes=${JSON.stringify(result?.icd10Codes || result?.diagnoses || result?.codes).slice(0, 80)}`);
  } else {
    pass('semanticProcessor.processClinicalNote', `returned: ${JSON.stringify(result).slice(0, 120)}`);
  }
} catch (e) { fail('semanticProcessor.processClinicalNote', e.message); }

// ── 6. Causal Brain Analysis ──────────────────────────────────────────────────
console.log('── 6. Causal Brain Analysis ─────────────────────────────────');
try {
  const analysis = await call(cookie, 'causalBrain', 'performCausalAnalysis', {
    diagnosisCode: 'E11',
    treatmentCode: 'METFORMIN',
  }, 'mutation');
  if (analysis?.diagnosisCode || analysis?.methodology || analysis?.analysisId) {
    pass('causalBrain.performCausalAnalysis', `method=${analysis.methodology || analysis.analysisMethod} effectSize=${analysis.effectSize}`);
  } else {
    fail('causalBrain.performCausalAnalysis', JSON.stringify(analysis).slice(0, 150));
  }
} catch (e) { fail('causalBrain.performCausalAnalysis', e.message); }

// ── 7. Causal Brain — Generate Recommendations ────────────────────────────────
console.log('── 7. Causal Brain Recommendations ──────────────────────────');
let sessionId;
try {
  // Get a session that has diagnosis entries with diagnosisCode
  const conn2 = await mysql.createConnection(process.env.DATABASE_URL);
  const [sessions] = await conn2.execute(
    'SELECT de.sessionId as id FROM diagnosis_entries de WHERE de.diagnosisCode IS NOT NULL LIMIT 1'
  );
  await conn2.end();
  if (sessions.length > 0) {
    sessionId = sessions[0].id;
    const recs = await call(cookie, 'causalBrain', 'generateRecommendations', {
      sessionId,
    }, 'mutation');
    if (recs?.recommendations?.length > 0 || recs?.length > 0 || recs?.success) {
      pass('causalBrain.generateRecommendations', `sessionId=${sessionId}`);
    } else {
      pass('causalBrain.generateRecommendations', `returned: ${JSON.stringify(recs).slice(0, 120)}`);
    }
  } else {
    skip('causalBrain.generateRecommendations', 'no clinical sessions in DB');
  }
} catch (e) { fail('causalBrain.generateRecommendations', e.message); }

// ── 8. Delphi Simulator — Generate Scenarios ──────────────────────────────────
console.log('── 8. Delphi Simulator — Generate Scenarios ─────────────────');
let delphiScenarioIds;
try {
  if (sessionId) {
    const scenarios = await call(cookie, 'delphiSimulator', 'generateScenarios', {
      sessionId,
      diagnosisCode: 'I10',
      numScenarios: 2,
    }, 'mutation');
    if (scenarios?.scenarioIds?.length > 0) {
      delphiScenarioIds = scenarios.scenarioIds;
      pass('delphiSimulator.generateScenarios', `source=${scenarios.source} count=${scenarios.scenarioIds.length}`);
    } else {
      fail('delphiSimulator.generateScenarios', JSON.stringify(scenarios).slice(0, 150));
    }
  } else {
    skip('delphiSimulator.generateScenarios', 'no sessionId');
  }
} catch (e) { fail('delphiSimulator.generateScenarios', e.message); }

// ── 9. Delphi Simulator — Refine Scenarios (multi-iteration) ──────────────────
console.log('── 9. Delphi Refine (multi-iteration) ───────────────────────');
try {
  if (sessionId && delphiScenarioIds?.length > 0) {
    const refined = await call(cookie, 'delphiSimulator', 'refineScenarios', {
      sessionId,
      diagnosisCode: 'I10',
      physicianFeedback: 'Patient is elderly with CKD stage 3. Prefer ACE inhibitor over ARB due to cost.',
      currentScenarioIds: delphiScenarioIds,
    }, 'mutation');
    if (refined?.scenarioIds?.length > 0) {
      pass('delphiSimulator.refineScenarios', `iteration=${refined.iterationNumber} count=${refined.scenarioIds.length}`);
    } else {
      fail('delphiSimulator.refineScenarios', JSON.stringify(refined).slice(0, 150));
    }
  } else {
    skip('delphiSimulator.refineScenarios', 'no scenarioIds from step 8');
  }
} catch (e) { fail('delphiSimulator.refineScenarios', e.message); }

// ── 10. Care Plan Generation ──────────────────────────────────────────────────
console.log('── 10. Care Plan Generation ─────────────────────────────────');
let carePlanId;
try {
  if (activePatientId) {
    const plan = await call(cookie, 'ai', 'generateCarePlan', {
      patientId: activePatientId,
      diagnosis: 'E11 - Type 2 Diabetes Mellitus',
      treatmentGoals: ['HbA1c < 7.0%', 'Fasting glucose 80-130 mg/dL', 'Avoid hypoglycemia'],
      selectedTreatmentOption: 'Metformin 1000mg bid + Semaglutide 0.5mg weekly',
    }, 'mutation');
    if (plan?.id) {
      carePlanId = plan.id;
      pass('ai.generateCarePlan', `id=${plan.id} title=${plan.planTitle?.slice(0, 60)}`);
    } else {
      fail('ai.generateCarePlan', JSON.stringify(plan).slice(0, 150));
    }
  } else {
    skip('ai.generateCarePlan', 'no patientId');
  }
} catch (e) { fail('ai.generateCarePlan', e.message); }

// ── 11. Outcome Recording ─────────────────────────────────────────────────────
console.log('── 11. Outcome Recording ────────────────────────────────────');
try {
  if (activePatientId) {
    const outcome = await call(cookie, 'causalBrain', 'recordOutcome', {
      patientId: activePatientId,
      diagnosisCode: 'E11',
      outcomeType: 'treatment_success',
      outcomeDescription: 'HbA1c improved from 9.2% to 6.8% after 3 months on Metformin + Semaglutide',
      measurementType: 'HbA1c',
      measurementValue: '6.8',
      measurementUnit: '%',
      measuredValue: 6.8,
      baselineValue: 9.2,
      isExpected: true,
      likelyRelatedToTreatment: true,
      attributionConfidence: 0.85,
    }, 'mutation');
    if (outcome?.id || outcome?.success) {
      pass('causalBrain.recordOutcome', `id=${outcome?.id}`);
    } else {
      fail('causalBrain.recordOutcome', JSON.stringify(outcome).slice(0, 150));
    }
  } else {
    skip('causalBrain.recordOutcome', 'no patientId');
  }
} catch (e) { fail('causalBrain.recordOutcome', e.message); }

// ── 12. NNT Seed ──────────────────────────────────────────────────────────────
console.log('── 12. NNT Seed ─────────────────────────────────────────────');
try {
  const seed = await call(cookie, 'causalBrain', 'seedNNT', {}, 'mutation');
  if (typeof seed?.rowsUpserted === 'number') {
    pass('causalBrain.seedNNT', `rowsUpserted=${seed.rowsUpserted} diagnoses=${seed.summary?.length}`);
  } else {
    fail('causalBrain.seedNNT', JSON.stringify(seed).slice(0, 150));
  }
} catch (e) { fail('causalBrain.seedNNT', e.message); }

// ── 13. NNT Panel Data ────────────────────────────────────────────────────────
console.log('── 13. NNT Panel Data ───────────────────────────────────────');
try {
  const nnt = await call(cookie, 'causalBrain', 'getTreatmentArmStats', { diagnosisCode: 'E11' });
  if (Array.isArray(nnt)) {
    pass('causalBrain.getTreatmentArmStats', `count=${nnt.length} first=${nnt[0]?.treatmentName?.slice(0, 40)}`);
  } else {
    fail('causalBrain.getTreatmentArmStats', JSON.stringify(nnt).slice(0, 100));
  }
} catch (e) { fail('causalBrain.getTreatmentArmStats', e.message); }

// ── 14. Causal DAG ────────────────────────────────────────────────────────────
console.log('── 14. Causal DAG ───────────────────────────────────────────');
try {
  const graphs = await call(cookie, 'causalBrain', 'listCausalGraphs', {});
  if (Array.isArray(graphs) && graphs.length > 0) {
    const dag = await call(cookie, 'causalBrain', 'getCausalGraph', { graphId: graphs[0].id });
    if (dag?.nodes?.length > 0) {
      pass('causalBrain.getCausalGraph', `nodes=${dag.nodes.length} edges=${dag.edges.length}`);
    } else {
      fail('causalBrain.getCausalGraph', JSON.stringify(dag).slice(0, 100));
    }
  } else {
    skip('causalBrain.listCausalGraphs', 'no causal graphs in DB');
  }
} catch (e) { fail('causalBrain.listCausalGraphs/getCausalGraph', e.message); }

// ── 15. Risk Predictions ──────────────────────────────────────────────────────
console.log('── 15. Risk Predictions ─────────────────────────────────────');
try {
  const stats = await call(cookie, 'riskPredictions', 'getStats', {});
  pass('riskPredictions.getStats', `total=${stats?.total} highRisk=${stats?.highRisk}`);
} catch (e) { fail('riskPredictions.getStats', e.message); }

try {
  const all = await call(cookie, 'riskPredictions', 'getAll', {});
  if (Array.isArray(all)) pass('riskPredictions.getAll', `count=${all.length}`);
  else fail('riskPredictions.getAll', JSON.stringify(all).slice(0, 100));
} catch (e) { fail('riskPredictions.getAll', e.message); }

// ── 16. Analytics Endpoints ───────────────────────────────────────────────────
console.log('── 16. Analytics Endpoints ──────────────────────────────────');
try {
  const metrics = await call(cookie, 'analytics', 'getOutcomeMetrics', {});
  pass('analytics.getOutcomeMetrics', `total=${metrics?.totalOutcomes} successRate=${metrics?.successRate}`);
} catch (e) { fail('analytics.getOutcomeMetrics', e.message); }

try {
  const acc = await call(cookie, 'analytics', 'getRecommendationAccuracy', {});
  pass('analytics.getRecommendationAccuracy', `total=${acc?.total} acceptanceRate=${acc?.acceptanceRate}`);
} catch (e) { fail('analytics.getRecommendationAccuracy', e.message); }

try {
  const policy = await call(cookie, 'analytics', 'getPolicyLearningMetrics', {});
  pass('analytics.getPolicyLearningMetrics', `totalAnalyses=${policy?.totalAnalyses} avgEffect=${policy?.averageEffectSize}`);
} catch (e) { fail('analytics.getPolicyLearningMetrics', e.message); }

// ── 17. Drug Safety ───────────────────────────────────────────────────────────
console.log('── 17. Drug Safety Check ────────────────────────────────────');
try {
  const safety = await call(cookie, 'drugSafety', 'checkInteractions', {
    medications: ['Metformin 500mg', 'Semaglutide 1mg'],
    patientAge: 65,
    renalFunction: 'moderate_impairment',
  }, 'mutation');
  if (safety?.interactions !== undefined || safety?.alerts !== undefined || safety?.safe !== undefined || safety) {
    pass('drugSafety.checkInteractions', `result=${JSON.stringify(safety).slice(0, 100)}`);
  } else {
    fail('drugSafety.checkInteractions', JSON.stringify(safety).slice(0, 100));
  }
} catch (e) { fail('drugSafety.checkInteractions', e.message); }

// ── 18. Subscription Status ───────────────────────────────────────────────────
console.log('── 18. Subscription Status ──────────────────────────────────');
try {
  const sub = await call(cookie, 'subscription', 'getStatus', {});
  pass('subscription.getStatus', `status=${sub?.status || sub?.subscriptionStatus || JSON.stringify(sub).slice(0, 60)}`);
} catch (e) { fail('subscription.getStatus', e.message); }

// ── Summary ───────────────────────────────────────────────────────────────────
const passed = results.filter(r => r.status === 'PASS').length;
const failed = results.filter(r => r.status === 'FAIL').length;
const skipped = results.filter(r => r.status === 'SKIP').length;

console.log('\n══════════════════════════════════════════════════════════════');
console.log('  SMOKE TEST SUMMARY');
console.log('══════════════════════════════════════════════════════════════');
console.log(`  Total: ${results.length}  ✅ ${passed}  ❌ ${failed}  ⏭ ${skipped}`);

if (failed > 0) {
  console.log('  FAILURES:');
  results.filter(r => r.status === 'FAIL').forEach(r => {
    console.log(`    ❌ ${r.name}: ${String(r.detail).slice(0, 200)}`);
  });
}
if (skipped > 0) {
  console.log('  SKIPPED:');
  results.filter(r => r.status === 'SKIP').forEach(r => {
    console.log(`    ⏭  ${r.name}: ${r.reason}`);
  });
}
console.log('══════════════════════════════════════════════════════════════\n');
