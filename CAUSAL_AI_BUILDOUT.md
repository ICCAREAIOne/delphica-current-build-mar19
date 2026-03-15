# Clinical Reasoning Engine — Build-Out Checklist

**Current completion: ~35% (architecture + LLM simulation layer)**
**Target: Production-grade causal AI with real statistical inference**

---

## Module Map

```
server/causal/
  index.ts          ← Public API — import everything from here
  types.ts          ← All shared interfaces (PatientContext, EvidenceSource, etc.)
  evidence.ts       ← Evidence retrieval (PubMed stub + LLM fallback)
  inference.ts      ← Causal analysis, convergence validation, treatment recommendations
  policy.ts         ← Policy learning, outcome feedback loop
  orchestrator.ts   ← Wires all modules; called by routers.ts

server/aiService.ts ← Delphi Simulator + Safety Review (DRB) — keep as-is
server/causalBrain.ts ← DEPRECATED — kept for backward compat; migrate callers to server/causal/
```

---

## Phase 1 — Evidence Layer (Next Sprint)

- [ ] **PubMed E-utilities integration** (`evidence.ts` → `fetchFromPubMed()`)
  - Endpoint: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/`
  - Steps: esearch → efetch → parse XML → EvidenceSource[]
  - Set `isVerified: true` on all returned records
  - No API key needed for < 3 req/sec; register NCBI account for higher limits

- [ ] **ICD-10 → MeSH term lookup table**
  - File: `server/causal/icd10_to_mesh.json`
  - Enables precise PubMed queries from diagnosis codes
  - Start with top 50 ICD-10 codes seen in practice

- [ ] **Evidence cache in DB**
  - Add `evidence_cache` table: `(query_hash, results_json, cached_at, expires_at)`
  - Cache TTL: 7 days (evidence doesn't change fast)
  - Prevents redundant PubMed API calls for repeated queries

- [ ] **Clinical guideline files**
  - Directory: `server/causal/guidelines/`
  - Format: `{icd10_prefix}.json` with structured guideline content
  - Priority sources: ACC/AHA (cardiology), ADA (diabetes), JNC 8 (hypertension), USPSTF

---

## Phase 2 — Statistical Inference Layer (Sprint 2)

- [ ] **Wire real patient_outcomes data into `performStatisticalAnalysis()`**
  - Replace hardcoded 3-row mock in `routers.ts` line ~3071
  - Query: `SELECT * FROM patient_outcomes WHERE diagnosisCode = ? AND treatmentCode = ?`
  - Minimum n = 10 before statistical analysis; use LLM fallback below threshold

- [ ] **Propensity score matching**
  - Option A: Python sidecar (`server/causal/scripts/causal_inference.py`)
    - Libraries: `statsmodels`, `scipy`, `pandas`
    - Call via `child_process.execFile()`
  - Option B: Pure JS with `ml-regression` npm package (simpler, less powerful)
  - Output: ATE (average treatment effect), 95% CI, p-value
  - Update `methodology` field from `"llm_simulated"` → `"propensity_score_matching"`

- [ ] **Confounder matrix builder**
  - Extract age, gender, comorbidities, severity score from PatientContext
  - Standardize into numeric feature vector for statistical analysis

- [ ] **Minimum sample size validation**
  - Enforce n ≥ 30 for propensity score matching
  - n ≥ 10: LLM analysis with real data
  - n < 10: LLM analysis with simulated data + explicit warning in UI

---

## Phase 3 — Policy Learning (Sprint 3)

- [ ] **`treatment_policy` table in DB**
  - Schema: `(treatmentCode, diagnosisCode, ageGroup, genderGroup, alpha, beta, updatedAt)`
  - `alpha` and `beta` are Beta distribution parameters for Bayesian updating
  - One row per (treatment × diagnosis × subgroup) tuple

- [ ] **Bayesian confidence updating** (`policy.ts` → `bayesianConfidenceUpdate()`)
  - Prior: `Beta(alpha, beta)` initialized at `Beta(7, 3)` → 70% prior confidence
  - Posterior: `Beta(alpha + successes, beta + failures)`
  - Updated confidence = `alpha_posterior / (alpha_posterior + beta_posterior)`
  - Replace LLM block in `updateTreatmentPolicy()`

- [ ] **Auto-trigger policy update on outcome record**
  - In `recordOutcomeAndUpdatePolicy()`: after saving outcome, check if n ≥ 10
  - If yes: run `updateTreatmentPolicy()` and save result to `treatment_policy` table
  - Read `previousConfidence` from `treatment_policy` table (not hardcoded 0.7)

- [ ] **Subgroup analysis**
  - Stratify outcomes by: age group (< 40, 40–65, > 65), gender, top 5 comorbidities
  - Separate Beta params per subgroup
  - Surface subgroup-specific confidence in Treatment Recommendations UI

---

## Phase 4 — Delphi-2M Cross-Pathway Integration (Sprint 4)

- [ ] **`longitudinalRiskImpact` scoring**
  - `inference.ts` → `generateTreatmentRecommendations()` already returns `longitudinalRiskImpact`
  - Build UI component to display this in Treatment Recommendations panel
  - Wire to Delphi-2M risk prediction output when available

- [ ] **Convergence Gate 2 UI**
  - Create `ConsultationRoom.tsx` section for Gate 2 physician selection
  - Show: Delphi simulation options + causal validity scores + evidence alignment
  - Physician selects preferred path → triggers `generateCarePlanWithSafetyReview()`

- [ ] **Iterative refinement loop**
  - If `validation.requiresRefinement === true`: re-run Delphi with refinement suggestions
  - Max 3 iterations before surfacing to physician for manual selection
  - Track iteration count in session

---

## Phase 5 — Router Migration (Do Now, Low Risk)

- [ ] **Migrate `causalBrain` router to use `server/causal/` modules**
  - `routers.ts` line ~2956: replace `import('./causalBrain')` with `import('./causal')`
  - `generateRecommendations` → `getTreatmentRecommendations()`
  - `performCausalAnalysis` → `runCausalAnalysis()`

- [ ] **Fix care plan generation stub in router**
  - `routers.ts` line ~648: replace hardcoded `causalRationale: "Based on clinical assessment"`
  - Call `generateCarePlanWithSafetyReview()` from orchestrator instead

- [ ] **Fix `updateRiskPredictionNotes` placeholder**
  - `routers.ts` line ~4217: implement `updateRiskPredictionNotes()` helper in `db.ts`

- [ ] **Wire `performCausalAnalysis` to real DB outcomes**
  - `routers.ts` line ~3071: replace 3-row mock with `db.getPatientOutcomesByTreatment()`

---

## Testing Checklist

- [ ] Unit test: `retrieveEvidence()` returns valid EvidenceSource[] shape
- [ ] Unit test: `performCausalAnalysis()` returns valid CausalAnalysisResult shape
- [ ] Unit test: `validateAndOptimize()` returns CausalValidationResult with all required fields
- [ ] Unit test: `updateTreatmentPolicy()` with 0 outcomes throws error
- [ ] Unit test: `updateTreatmentPolicy()` with 15 outcomes returns valid PolicyUpdateResult
- [ ] Integration test: full three-gate pipeline (Gate 1 → Gate 2 → Gate 3) completes without error
- [ ] Integration test: outcome recording triggers policy update when n ≥ 10

---

## File Reference

| File | Purpose | Status |
|---|---|---|
| `server/causal/types.ts` | All shared interfaces | ✅ Complete |
| `server/causal/evidence.ts` | Evidence retrieval | ✅ LLM stub; PubMed TODO |
| `server/causal/inference.ts` | Causal analysis + convergence | ✅ LLM; stats TODO |
| `server/causal/policy.ts` | Policy learning | ✅ LLM; Bayesian TODO |
| `server/causal/orchestrator.ts` | Module wiring | ✅ Complete |
| `server/causal/index.ts` | Public API barrel | ✅ Complete |
| `server/aiService.ts` | Delphi Simulator + DRB | ✅ Keep as-is |
| `server/causalBrain.ts` | Legacy — migrate callers | ⚠️ Deprecated |

---

## Completed: Separate Knowledge Stores (Mar 15, 2026)

Three new tables added to the schema, DB helpers written, and wired into the engines:

### `causal_knowledge_base`
- Curated clinical guidelines + Bayesian priors per condition/treatment pair
- Key columns: `conditionCode` (ICD-10), `treatmentName`, `evidenceGrade` (A–I), `betaAlpha`/`betaBeta` (Beta distribution priors), `observationCount`, `guidelineSource`
- **Wired into**: `causal/inference.ts` → `performCausalAnalysis()` — queries guidelines by ICD-10 code and injects as "Clinical Guidelines (Causal Knowledge Base)" into the LLM prompt
- **DB helpers**: `getCausalKnowledgeByCondition()`, `getCausalKnowledgeByTreatment()`, `searchCausalKnowledge()`, `upsertCausalKnowledge()`, `updateCausalKnowledgePriors()`
- **Next step**: Seed with ADA 2024, ACC/AHA 2023, USPSTF guidelines via admin seeding script

### `delphi_scenario_templates`
- Reusable scenario archetypes (e.g., "T2DM + CKD — Renal-Safe Options") with pre-computed treatment option trees
- Key columns: `diagnosisCode`, `comorbidityProfile` (JSON), `ageRangeMin/Max`, `treatmentOptions` (JSON tree), `outcomeDistributions`, `usageCount`, `successRate`, `isVerified`
- **Wired into**: `routers.ts` → `delphiSimulator.generateScenarios` — template-first strategy: checks for verified templates before calling LLM; skips LLM entirely when enough verified templates exist
- **DB helpers**: `getDelphiTemplatesByDiagnosis()`, `createDelphiTemplate()`, `updateDelphiTemplateUsage()`, `approveDelphiTemplate()`
- **Next step**: Build admin UI to approve LLM-generated scenarios as reusable templates; seed 10 common archetypes

### `evidence_cache_engine_tags`
- Join table tagging each `evidence_cache` entry with the engine that retrieved it (causal | delphi | both)
- Key columns: `evidenceCacheId` (FK → evidence_cache), `engine`, `engineRelevanceScore`, `queryContext`
- **Wired into**: `causal/evidence.ts` → `_cacheEvidence()` — tags every PubMed cache write as `engine: "causal"`
- **DB helpers**: `tagEvidenceCacheEntry()`, `getEvidenceByEngine()`
- **Next step**: Tag Delphi engine evidence retrievals as "delphi" when Delphi starts calling `retrieveEvidence()` directly
