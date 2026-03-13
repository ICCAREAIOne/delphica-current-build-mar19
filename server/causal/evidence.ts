/**
 * ============================================================
 * CAUSAL AI ENGINE — EVIDENCE RETRIEVAL LAYER
 * server/causal/evidence.ts
 *
 * Responsible for retrieving medical evidence to ground all
 * Clinical Reasoning Engine outputs.
 *
 * CURRENT STATE:  LLM-simulated evidence (isVerified: false)
 * BUILD TARGET:   Real PubMed E-utilities API + guideline cache
 *
 * BUILD ORDER:
 *   Step 1 (now):    LLM simulation — functional, not verified
 *   Step 2 (next):   PubMed E-utilities REST API integration
 *   Step 3 (later):  Local guideline cache (ACC/AHA, JNC, USPSTF)
 *   Step 4 (later):  Evidence cache in DB (evidence_cache table)
 * ============================================================
 */

import { invokeLLM } from "../_core/llm";
import type { EvidenceSource, EvidenceQuery } from "./types";

// ─────────────────────────────────────────────
// STEP 2 TODO: PubMed E-utilities API
// Endpoint: https://eutils.ncbi.nlm.nih.gov/entrez/eutils/
// No API key required for <3 req/sec; register for higher limits
// Docs: https://www.ncbi.nlm.nih.gov/books/NBK25499/
//
// Implementation plan:
//   1. esearch.fcgi?db=pubmed&term={query}&retmax=10&sort=relevance
//      → returns list of PMIDs
//   2. efetch.fcgi?db=pubmed&id={pmids}&rettype=abstract&retmode=xml
//      → returns abstracts + metadata
//   3. Parse XML → EvidenceSource[]
//   4. Set isVerified: true on all returned results
//   5. Cache results in evidence_cache table (keyed by query hash)
//
// async function fetchFromPubMed(query: string, maxResults: number): Promise<EvidenceSource[]>
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// STEP 3 TODO: Clinical Guideline Cache
// Sources to integrate:
//   - ACC/AHA guidelines (cardiology)
//   - JNC 8 (hypertension)
//   - ADA Standards of Care (diabetes)
//   - USPSTF recommendations
//   - UpToDate API (requires license)
//
// Store as structured JSON in /server/causal/guidelines/
// Index by ICD-10 code prefix for fast lookup
// ─────────────────────────────────────────────

/**
 * Primary evidence retrieval function.
 *
 * Currently uses LLM to simulate evidence retrieval.
 * Replace the body of this function with real PubMed calls
 * when Step 2 is implemented. The interface stays the same.
 */
export async function retrieveEvidence(query: EvidenceQuery): Promise<EvidenceSource[]> {
  const maxResults = query.maxResults ?? 5;

  // ── STEP 2: Replace this block with real PubMed API call ──
  // const pubmedResults = await fetchFromPubMed(buildPubMedQuery(query), maxResults);
  // if (pubmedResults.length > 0) return pubmedResults;
  // ──────────────────────────────────────────────────────────

  // CURRENT: LLM simulation fallback
  return await _llmSimulatedEvidence(query, maxResults);
}

/**
 * Build a structured PubMed search query string from an EvidenceQuery.
 * TODO: Expand with MeSH terms for better precision.
 *
 * Example output: "hypertension[MeSH] AND lisinopril[tiab] AND randomized controlled trial[pt]"
 */
export function buildPubMedQuery(query: EvidenceQuery): string {
  const parts: string[] = [];

  if (query.diagnosisCode) {
    // TODO: Map ICD-10 → MeSH term using a lookup table
    // For now, use the description as a free-text term
  }
  if (query.diagnosisDescription) {
    parts.push(`${query.diagnosisDescription}[tiab]`);
  }
  if (query.treatmentName) {
    parts.push(`${query.treatmentName}[tiab]`);
  }
  // Prefer high-quality study types
  parts.push("(randomized controlled trial[pt] OR meta-analysis[pt] OR systematic review[pt])");

  return parts.join(" AND ");
}

/**
 * LLM-simulated evidence retrieval.
 * Used as fallback until real PubMed integration is built.
 *
 * WARNING: Citations generated here are NOT verified against real databases.
 * PMIDs may be fabricated. Do not display raw PMIDs to clinicians without
 * verification. Mark all results with isVerified: false.
 */
async function _llmSimulatedEvidence(
  query: EvidenceQuery,
  maxResults: number
): Promise<EvidenceSource[]> {
  const queryText = [
    query.diagnosisDescription && `Diagnosis: ${query.diagnosisDescription}`,
    query.treatmentName && `Treatment: ${query.treatmentName}`,
    query.patientAge && `Patient age: ${query.patientAge}`,
    query.comorbidities?.length && `Comorbidities: ${query.comorbidities.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a medical research assistant generating representative evidence summaries.
Generate ${maxResults} plausible evidence sources for the clinical query.
Include a mix of RCTs, meta-analyses, and clinical guidelines.
Be specific about study findings but note these are representative summaries.
Use realistic journal names (NEJM, JAMA, Lancet, Circulation, etc.).
Evidence grades: A=strong RCT/meta-analysis, B=moderate evidence, C=expert consensus.`,
      },
      {
        role: "user",
        content: queryText,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "evidence_sources",
        strict: true,
        schema: {
          type: "object",
          properties: {
            sources: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  authors: { type: "string" },
                  publicationDate: { type: "string" },
                  journal: { type: "string" },
                  doi: { type: "string" },
                  pmid: { type: "string" },
                  keyFindings: { type: "string" },
                  evidenceGrade: { type: "string" },
                  studyType: { type: "string" },
                  relevanceScore: { type: "number" },
                },
                required: ["title", "keyFindings", "evidenceGrade", "relevanceScore"],
                additionalProperties: false,
              },
            },
          },
          required: ["sources"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== "string") return [];

  const parsed = JSON.parse(content);
  return parsed.sources.map((s: any) => ({
    ...s,
    isVerified: false,           // LLM-generated — not verified against PubMed
    retrievedAt: new Date(),
  }));
}
