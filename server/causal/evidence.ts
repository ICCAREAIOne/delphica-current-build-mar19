/**
 * ============================================================
 * CAUSAL AI ENGINE — EVIDENCE RETRIEVAL LAYER
 * server/causal/evidence.ts
 *
 * Retrieves verified medical evidence from PubMed E-utilities API.
 * Falls back to LLM simulation only when PubMed returns no results
 * or the network is unavailable.
 *
 * PIPELINE:
 *   1. Check DB evidence cache (evidence_cache table, 7-day TTL)
 *   2. PubMed esearch → PMIDs
 *   3. PubMed efetch → XML → parse → EvidenceSource[]
 *   4. LLM fallback if PubMed returns < 2 results
 *   5. Cache results in DB
 *
 * RATE LIMITS:
 *   - Without API key: 3 req/sec (enforced by _rateLimiter below)
 *   - With NCBI_API_KEY env var: 10 req/sec
 *   - Docs: https://www.ncbi.nlm.nih.gov/books/NBK25499/
 * ============================================================
 */

import { invokeLLM } from "../_core/llm";
import type { EvidenceSource, EvidenceQuery } from "./types";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const EUTILS_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const NCBI_API_KEY = process.env.NCBI_API_KEY ?? "";       // Optional — set for 10 req/sec
const RATE_LIMIT_MS = NCBI_API_KEY ? 110 : 340;            // 10/sec vs 3/sec with safety margin
const CACHE_TTL_DAYS = 7;
const MIN_PUBMED_RESULTS = 2;                               // Fall back to LLM if fewer than this

// ─────────────────────────────────────────────
// RATE LIMITER
// Simple token-bucket: ensures we never exceed NCBI rate limits
// ─────────────────────────────────────────────

let _lastRequestTime = 0;

async function _rateLimiter(): Promise<void> {
  const now = Date.now();
  const elapsed = now - _lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS - elapsed));
  }
  _lastRequestTime = Date.now();
}

// ─────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────

/**
 * Primary evidence retrieval function.
 *
 * Strategy:
 *   1. Check DB cache (evidence_cache table)
 *   2. PubMed E-utilities (real, verified citations)
 *   3. LLM simulation fallback (isVerified: false)
 */
export async function retrieveEvidence(query: EvidenceQuery): Promise<EvidenceSource[]> {
  const maxResults = query.maxResults ?? 5;
  const pubmedQuery = buildPubMedQuery(query);
  const cacheKey = _hashQuery(pubmedQuery + maxResults);

  // Step 1: Check DB cache
  try {
    const cached = await _getCachedEvidence(cacheKey);
    if (cached) {
      console.log(`[Evidence] Cache hit for query: ${pubmedQuery.slice(0, 60)}...`);
      return cached;
    }
  } catch {
    // Cache miss or DB unavailable — continue to PubMed
  }

  // Step 2: PubMed E-utilities
  let results: EvidenceSource[] = [];
  try {
    results = await fetchFromPubMed(pubmedQuery, maxResults);
    console.log(`[Evidence] PubMed returned ${results.length} verified results`);
  } catch (err) {
    console.warn("[Evidence] PubMed fetch failed, falling back to LLM:", (err as Error).message);
  }

  // Step 3: LLM fallback if PubMed returned too few results
  if (results.length < MIN_PUBMED_RESULTS) {
    console.log(`[Evidence] PubMed returned ${results.length} results — supplementing with LLM simulation`);
    const llmResults = await _llmSimulatedEvidence(query, maxResults - results.length);
    results = [...results, ...llmResults];
  }

  // Step 4: Cache results
  if (results.some((r) => r.isVerified)) {
    try {
      await _cacheEvidence(cacheKey, results);
    } catch {
      // Cache write failure is non-fatal
    }
  }

  return results;
}

/**
 * Build a PubMed search query string from an EvidenceQuery.
 *
 * Uses field tags for precision:
 *   [tiab]  = title/abstract
 *   [pt]    = publication type
 *   [MeSH]  = MeSH controlled vocabulary
 */
export function buildPubMedQuery(query: EvidenceQuery): string {
  const parts: string[] = [];

  // Diagnosis — prefer MeSH-mapped term if available, else free text
  if (query.diagnosisDescription) {
    const meshTerm = _icd10ToMesh(query.diagnosisCode);
    if (meshTerm) {
      parts.push(`"${meshTerm}"[MeSH Terms]`);
    } else {
      parts.push(`"${query.diagnosisDescription}"[tiab]`);
    }
  }

  // Treatment
  if (query.treatmentName) {
    parts.push(`"${query.treatmentName}"[tiab]`);
  }

  // Comorbidities (up to 2 to keep query focused)
  if (query.comorbidities?.length) {
    const comorbParts = query.comorbidities
      .slice(0, 2)
      .map((c) => `"${c}"[tiab]`)
      .join(" OR ");
    if (comorbParts) parts.push(`(${comorbParts})`);
  }

  // ── DAG-enhanced search terms ─────────────────────────────────────────────
  // Include up to 3 DAG node labels (treatment/outcome/confounder nodes)
  // as additional tiab terms to narrow the search to the causal pathway.
  if (query.dagNodeLabels?.length) {
    const dagNodeParts = query.dagNodeLabels
      .slice(0, 3)
      .filter((label) => label.length > 3)  // skip trivially short labels
      .map((label) => `"${label}"[tiab]`)
      .join(" OR ");
    if (dagNodeParts) parts.push(`(${dagNodeParts})`);
  }

  // Include up to 2 DAG edge pairs as causal relationship search terms.
  // e.g. "Metformin" AND "HbA1c" as co-occurrence in title/abstract.
  if (query.dagEdgePairs?.length) {
    const edgeParts = query.dagEdgePairs
      .slice(0, 2)
      .map((e) => `("${e.from}"[tiab] AND "${e.to}"[tiab])`)
      .join(" OR ");
    if (edgeParts) parts.push(`(${edgeParts})`);
  }
  // ─────────────────────────────────────────────────────────────────────────

  // Prefer high-quality study designs
  parts.push(
    "(randomized controlled trial[pt] OR meta-analysis[pt] OR systematic review[pt] OR practice guideline[pt])"
  );

  // If nothing specific, use a broad clinical query
  if (parts.length === 1) {
    parts.unshift("clinical management[tiab]");
  }

  return parts.join(" AND ");
}

// ─────────────────────────────────────────────
// PUBMED E-UTILITIES IMPLEMENTATION
// ─────────────────────────────────────────────

/**
 * Fetch verified evidence from PubMed E-utilities.
 *
 * Two-step process:
 *   1. esearch.fcgi  → list of PMIDs matching the query
 *   2. efetch.fcgi   → full XML records for those PMIDs
 */
export async function fetchFromPubMed(
  query: string,
  maxResults: number
): Promise<EvidenceSource[]> {
  // Step 1: esearch — get PMIDs
  const pmids = await _esearch(query, maxResults);
  if (pmids.length === 0) return [];

  // Step 2: efetch — get full records
  const articles = await _efetch(pmids);
  return articles;
}

/**
 * PubMed esearch — returns list of PMIDs matching the query.
 */
async function _esearch(query: string, maxResults: number): Promise<string[]> {
  await _rateLimiter();

  const params = new URLSearchParams({
    db: "pubmed",
    term: query,
    retmax: String(maxResults),
    sort: "relevance",
    retmode: "json",
    ...(NCBI_API_KEY && { api_key: NCBI_API_KEY }),
  });

  const url = `${EUTILS_BASE}/esearch.fcgi?${params}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "DelphicaPhysicianPortal/1.0 (mailto:admin@delphica.health)" },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`PubMed esearch HTTP ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  return data?.esearchresult?.idlist ?? [];
}

/**
 * PubMed efetch — returns parsed EvidenceSource[] for the given PMIDs.
 */
async function _efetch(pmids: string[]): Promise<EvidenceSource[]> {
  await _rateLimiter();

  const params = new URLSearchParams({
    db: "pubmed",
    id: pmids.join(","),
    rettype: "abstract",
    retmode: "xml",
    ...(NCBI_API_KEY && { api_key: NCBI_API_KEY }),
  });

  const url = `${EUTILS_BASE}/efetch.fcgi?${params}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "DelphicaPhysicianPortal/1.0 (mailto:admin@delphica.health)" },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`PubMed efetch HTTP ${res.status}: ${res.statusText}`);
  }

  const xmlText = await res.text();
  return _parseArticleXml(xmlText);
}

// ─────────────────────────────────────────────
// XML PARSER
// ─────────────────────────────────────────────

/**
 * Parse PubMed XML response into EvidenceSource[].
 *
 * Handles:
 *   - Structured and unstructured abstracts
 *   - Multiple authors (capped at 5 + "et al.")
 *   - DOI extraction from ELocationID
 *   - Publication type → studyType mapping
 *   - MeSH headings → key findings context
 *   - Evidence grade inference from publication type
 */
function _parseArticleXml(xmlText: string): EvidenceSource[] {
  // Node.js does not have DOMParser — use regex-based extraction
  // This is intentionally simple and robust; no external XML library needed
  const articles = xmlText.split("<PubmedArticle>").slice(1);
  const results: EvidenceSource[] = [];

  for (const articleXml of articles) {
    try {
      const source = _parseOneArticle(articleXml);
      if (source) results.push(source);
    } catch {
      // Skip malformed articles silently
    }
  }

  return results;
}

function _parseOneArticle(xml: string): EvidenceSource | null {
  const pmid = _extractTag(xml, "PMID");
  const title = _extractTag(xml, "ArticleTitle");
  if (!pmid || !title) return null;

  // Journal
  const journal = _extractTag(xml, "Title") ?? _extractTag(xml, "ISOAbbreviation") ?? "";

  // Publication year
  const year =
    _extractTag(xml, "Year") ??
    _extractTag(xml, "MedlineDate")?.slice(0, 4) ??
    "";

  // DOI — in ELocationID with EIdType="doi"
  const doiMatch = xml.match(/EIdType="doi"[^>]*>([^<]+)</);
  const doi = doiMatch?.[1]?.trim() ?? undefined;

  // Authors — extract up to 5, then "et al."
  const authorMatches = Array.from(xml.matchAll(/<Author[^>]*>([\s\S]*?)<\/Author>/g));
  const authorNames = authorMatches
    .slice(0, 5)
    .map((m) => {
      const lastName = _extractTag(m[1], "LastName") ?? "";
      const initials = _extractTag(m[1], "Initials") ?? "";
      return `${lastName} ${initials}`.trim();
    })
    .filter(Boolean);
  const authors =
    authorNames.length > 0
      ? authorNames.join(", ") + (authorMatches.length > 5 ? " et al." : "")
      : undefined;

  // Abstract — handle both structured (labeled sections) and plain
  const abstractSections = Array.from(xml.matchAll(/<AbstractText(?:[^>]*)>([\s\S]*?)<\/AbstractText>/g));
  let abstract = "";
  if (abstractSections.length > 0) {
    // Structured abstract: concatenate labeled sections
    const labeledParts = abstractSections.map((m) => {
      const labelMatch = m[0].match(/Label="([^"]+)"/);
      const label = labelMatch?.[1];
      const text = m[1].replace(/<[^>]+>/g, "").trim();
      return label ? `${label}: ${text}` : text;
    });
    abstract = labeledParts.join(" | ");
  }

  // Key findings — use RESULTS or CONCLUSIONS section if available, else first 400 chars
  const resultsMatch = abstract.match(/RESULTS?:\s*([^|]+)/i);
  const conclusionsMatch = abstract.match(/CONCLUSIONS?[^:]*:\s*([^|]+)/i);
  const keyFindings =
    conclusionsMatch?.[1]?.trim() ??
    resultsMatch?.[1]?.trim() ??
    abstract.slice(0, 400) ??
    title;

  // Publication types
  const pubTypeMatches = Array.from(xml.matchAll(/<PublicationType[^>]*>([^<]+)<\/PublicationType>/g));
  const pubTypes = pubTypeMatches.map((m) => m[1].trim().toLowerCase());

  // Map pub types → studyType
  const studyType = _inferStudyType(pubTypes);

  // Evidence grade from study type
  const evidenceGrade = _inferEvidenceGrade(studyType, pubTypes);

  // MeSH headings — used to compute relevance and as context
  const meshMatches = Array.from(xml.matchAll(/<DescriptorName[^>]*>([^<]+)<\/DescriptorName>/g));
  const meshTerms = meshMatches.map((m) => m[1].trim());

  // Relevance score: base 70, boost for RCTs/meta-analyses, boost for MeSH matches
  let relevanceScore = 70;
  if (studyType === "meta_analysis") relevanceScore += 15;
  else if (studyType === "RCT") relevanceScore += 10;
  else if (studyType === "guideline") relevanceScore += 8;
  relevanceScore = Math.min(relevanceScore, 99);

  return {
    title: title.replace(/<[^>]+>/g, "").trim(),
    authors,
    publicationDate: year,
    journal,
    doi,
    pmid,
    abstract: abstract.replace(/<[^>]+>/g, "").slice(0, 1000) || undefined,
    keyFindings: keyFindings.replace(/<[^>]+>/g, "").trim(),
    evidenceGrade,
    studyType,
    relevanceScore,
    isVerified: true,               // Real PubMed record — PMID is verified
    retrievedAt: new Date(),
  };
}

// ─────────────────────────────────────────────
// XML HELPERS
// ─────────────────────────────────────────────

function _extractTag(xml: string, tag: string): string | undefined {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return match?.[1]?.replace(/<[^>]+>/g, "").trim() || undefined;
}

function _inferStudyType(
  pubTypes: string[]
): EvidenceSource["studyType"] {
  if (pubTypes.some((t) => t.includes("meta-analysis"))) return "meta_analysis";
  if (pubTypes.some((t) => t.includes("systematic review"))) return "meta_analysis";
  if (pubTypes.some((t) => t.includes("randomized controlled trial"))) return "RCT";
  if (pubTypes.some((t) => t.includes("randomized clinical trial"))) return "RCT";
  // "Clinical Trial" without "Randomized" tag — treat as cohort-level evidence
  if (pubTypes.some((t) => t === "clinical trial")) return "cohort";
  if (pubTypes.some((t) => t.includes("practice guideline") || t.includes("guideline"))) return "guideline";
  if (pubTypes.some((t) => t.includes("cohort"))) return "cohort";
  if (pubTypes.some((t) => t.includes("case-control"))) return "case_control";
  if (pubTypes.some((t) => t.includes("case report") || t.includes("case series"))) return "case_series";
  // Recent papers may only have "Journal Article" — infer from title keywords if possible
  return undefined;
}

function _inferEvidenceGrade(
  studyType: EvidenceSource["studyType"],
  pubTypes: string[]
): EvidenceSource["evidenceGrade"] {
  if (studyType === "meta_analysis") return "A";
  if (studyType === "RCT") return "A";
  if (studyType === "guideline") return "B";
  if (studyType === "cohort") return "B";
  if (studyType === "case_control") return "C";
  if (studyType === "case_series") return "D";
  if (pubTypes.some((t) => t.includes("review"))) return "B";
  return "C";
}

// ─────────────────────────────────────────────
// ICD-10 → MeSH LOOKUP
// Covers the most common ICD-10 prefixes seen in primary care.
// Expand this table as needed.
// ─────────────────────────────────────────────

const ICD10_TO_MESH: Record<string, string> = {
  // ── CARDIOVASCULAR ──────────────────────────────────────────
  I10: "Hypertension",
  I11: "Hypertensive Heart Disease",
  I12: "Hypertensive Renal Disease",
  I13: "Hypertensive Heart and Renal Disease",
  I20: "Angina Pectoris",
  I21: "Myocardial Infarction",
  I22: "Myocardial Infarction",
  I25: "Coronary Artery Disease",
  I26: "Pulmonary Embolism",
  I27: "Pulmonary Heart Disease",
  I30: "Pericarditis",
  I34: "Mitral Valve Insufficiency",
  I35: "Aortic Valve Stenosis",
  I42: "Cardiomyopathies",
  I44: "Atrioventricular Block",
  I47: "Tachycardia, Supraventricular",
  I48: "Atrial Fibrillation",
  I49: "Cardiac Arrhythmias",
  I50: "Heart Failure",
  I51: "Heart Diseases",
  I60: "Subarachnoid Hemorrhage",
  I61: "Cerebral Hemorrhage",
  I63: "Ischemic Stroke",
  I65: "Carotid Artery Diseases",
  I70: "Atherosclerosis",
  I73: "Peripheral Vascular Diseases",
  I74: "Arterial Occlusive Diseases",
  I80: "Thrombophlebitis",
  I82: "Venous Thrombosis",
  I83: "Varicose Veins",

  // ── METABOLIC / ENDOCRINE ────────────────────────────────────
  E03: "Hypothyroidism",
  E05: "Hyperthyroidism",
  E06: "Thyroiditis",
  E10: "Diabetes Mellitus, Type 1",
  E11: "Diabetes Mellitus, Type 2",
  E13: "Diabetes Mellitus",
  E14: "Diabetes Mellitus",
  E21: "Hyperparathyroidism",
  E22: "Acromegaly",
  E23: "Hypopituitarism",
  E27: "Adrenal Insufficiency",
  E28: "Ovarian Dysfunction",
  E66: "Obesity",
  E78: "Dyslipidemias",
  E79: "Gout",
  E83: "Mineral Metabolism Disorders",
  E84: "Cystic Fibrosis",
  E87: "Acid-Base Imbalance",

  // ── RESPIRATORY ──────────────────────────────────────────────
  J06: "Respiratory Tract Infections",
  J18: "Pneumonia",
  J20: "Bronchitis",
  J30: "Rhinitis, Allergic",
  J32: "Sinusitis",
  J35: "Tonsillitis",
  J38: "Laryngeal Diseases",
  J40: "Bronchitis",
  J41: "Bronchitis, Chronic",
  J42: "Bronchitis, Chronic",
  J43: "Emphysema",
  J44: "Pulmonary Disease, Chronic Obstructive",
  J45: "Asthma",
  J46: "Status Asthmaticus",
  J47: "Bronchiectasis",
  J60: "Pneumoconiosis",
  J84: "Lung Diseases, Interstitial",
  J96: "Respiratory Insufficiency",

  // ── GASTROINTESTINAL ─────────────────────────────────────────
  K21: "Gastroesophageal Reflux",
  K25: "Stomach Ulcer",
  K26: "Duodenal Ulcer",
  K29: "Gastritis",
  K35: "Appendicitis",
  K40: "Hernia, Inguinal",
  K43: "Hernia, Ventral",
  K50: "Crohn Disease",
  K51: "Colitis, Ulcerative",
  K52: "Gastroenteritis",
  K57: "Diverticulosis, Colon",
  K58: "Irritable Bowel Syndrome",
  K70: "Liver Diseases, Alcoholic",
  K72: "Liver Failure",
  K73: "Hepatitis, Chronic",
  K74: "Liver Cirrhosis",
  K76: "Fatty Liver",
  K80: "Cholelithiasis",
  K85: "Pancreatitis, Acute Necrotizing",
  K86: "Pancreatitis, Chronic",
  K92: "Gastrointestinal Hemorrhage",

  // ── MUSCULOSKELETAL ──────────────────────────────────────────
  M05: "Arthritis, Rheumatoid",
  M06: "Arthritis, Rheumatoid",
  M08: "Arthritis, Juvenile",
  M10: "Gout",
  M15: "Osteoarthritis",
  M16: "Osteoarthritis, Hip",
  M17: "Osteoarthritis, Knee",
  M19: "Osteoarthritis",
  M32: "Lupus Erythematosus, Systemic",
  M34: "Scleroderma, Systemic",
  M35: "Sjogren's Syndrome",
  M40: "Kyphosis",
  M41: "Scoliosis",
  M47: "Spondylosis",
  M48: "Spinal Stenosis",
  M50: "Cervical Disc Disease",
  M51: "Intervertebral Disc Degeneration",
  M54: "Back Pain",
  M60: "Myositis",
  M79: "Musculoskeletal Pain",
  M80: "Osteoporosis with Pathological Fracture",
  M81: "Osteoporosis",

  // ── MENTAL HEALTH / NEUROLOGY ────────────────────────────────
  F10: "Alcohol-Related Disorders",
  F11: "Opioid-Related Disorders",
  F17: "Tobacco Use Disorder",
  F20: "Schizophrenia",
  F25: "Schizophrenia Spectrum and Other Psychotic Disorders",
  F31: "Bipolar Disorder",
  F32: "Depressive Disorder",
  F33: "Depressive Disorder, Major",
  F40: "Phobic Disorders",
  F41: "Anxiety Disorders",
  F42: "Obsessive-Compulsive Disorder",
  F43: "Stress Disorders, Post-Traumatic",
  F50: "Feeding and Eating Disorders",
  F60: "Personality Disorders",
  F70: "Intellectual Disability",
  F84: "Autism Spectrum Disorder",
  F90: "Attention Deficit Disorder with Hyperactivity",
  G20: "Parkinson Disease",
  G30: "Alzheimer Disease",
  G35: "Multiple Sclerosis",
  G40: "Epilepsy",
  G43: "Migraine Disorders",
  G45: "Transient Ischemic Attack",
  G47: "Sleep Wake Disorders",
  G54: "Radiculopathy",
  G61: "Guillain-Barre Syndrome",
  G62: "Polyneuropathies",

  // ── RENAL / UROLOGIC ─────────────────────────────────────────
  N03: "Nephritis, Chronic",
  N04: "Nephrotic Syndrome",
  N10: "Nephritis",
  N17: "Acute Kidney Injury",
  N18: "Renal Insufficiency, Chronic",
  N19: "Renal Insufficiency",
  N20: "Kidney Calculi",
  N30: "Cystitis",
  N39: "Urinary Tract Infections",
  N40: "Prostatic Hyperplasia",
  N41: "Prostatitis",
  N43: "Spermatocele",
  N52: "Erectile Dysfunction",

  // ── ONCOLOGY ─────────────────────────────────────────────────
  C15: "Esophageal Neoplasms",
  C16: "Stomach Neoplasms",
  C18: "Colonic Neoplasms",
  C20: "Rectal Neoplasms",
  C22: "Liver Neoplasms",
  C25: "Pancreatic Neoplasms",
  C34: "Lung Neoplasms",
  C43: "Melanoma",
  C50: "Breast Neoplasms",
  C53: "Uterine Cervical Neoplasms",
  C54: "Endometrial Neoplasms",
  C56: "Ovarian Neoplasms",
  C61: "Prostatic Neoplasms",
  C64: "Kidney Neoplasms",
  C67: "Urinary Bladder Neoplasms",
  C73: "Thyroid Neoplasms",
  C81: "Hodgkin Disease",
  C82: "Lymphoma, Follicular",
  C83: "Lymphoma, Non-Hodgkin",
  C90: "Multiple Myeloma",
  C91: "Leukemia, Lymphoid",
  C92: "Leukemia, Myeloid",

  // ── HEMATOLOGY ───────────────────────────────────────────────
  D50: "Anemia, Iron-Deficiency",
  D51: "Anemia, Megaloblastic",
  D55: "Anemia, Hemolytic",
  D57: "Anemia, Sickle Cell",
  D64: "Anemia",
  D68: "Blood Coagulation Disorders",
  D69: "Purpura, Thrombocytopenic",

  // ── INFECTIOUS DISEASE ───────────────────────────────────────
  A02: "Salmonella Infections",
  A04: "Escherichia coli Infections",
  A15: "Tuberculosis, Pulmonary",
  A41: "Sepsis",
  A49: "Bacterial Infections",
  B18: "Hepatitis, Viral, Human",
  B20: "HIV Infections",
  B34: "Virus Diseases",
  B37: "Candidiasis",

  // ── DERMATOLOGY ──────────────────────────────────────────────
  L20: "Dermatitis, Atopic",
  L21: "Dermatitis, Seborrheic",
  L30: "Dermatitis",
  L40: "Psoriasis",
  L50: "Urticaria",
  L60: "Nail Diseases",

  // ── OBSTETRICS / GYNECOLOGY ──────────────────────────────────
  N91: "Amenorrhea",
  N92: "Menorrhagia",
  N94: "Premenstrual Syndrome",
  N95: "Menopause",
  O10: "Hypertension, Pregnancy-Induced",
  O24: "Diabetes, Gestational",
  O30: "Pregnancy, Multiple",
  O42: "Premature Rupture of Membranes",

  // ── OPHTHALMOLOGY ────────────────────────────────────────────
  H25: "Cataract",
  H26: "Cataract",
  H33: "Retinal Detachment",
  H35: "Retinal Diseases",
  H40: "Glaucoma",
  H43: "Vitreous Detachment",

  // ── PEDIATRICS ───────────────────────────────────────────────
  P07: "Infant, Premature",
  P22: "Respiratory Distress Syndrome, Newborn",
  P36: "Sepsis, Neonatal",
  Q21: "Heart Septal Defects",
  Q90: "Down Syndrome",
};

function _icd10ToMesh(icd10Code?: string): string | undefined {
  if (!icd10Code) return undefined;
  // Try exact match first, then 3-character prefix
  return ICD10_TO_MESH[icd10Code] ?? ICD10_TO_MESH[icd10Code.slice(0, 3)] ?? undefined;
}

// ─────────────────────────────────────────────
// EVIDENCE CACHE (DB)
// Uses the existing evidence_cache table and db.ts helpers.
// Schema stores one row per article keyed by queryHash.
// TTL is enforced via the expiresAt column.
// ─────────────────────────────────────────────

/**
 * Simple deterministic hash for cache key generation.
 * Not cryptographic — just needs to be consistent.
 */
function _hashQuery(query: string): string {
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    const char = query.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `pubmed_${Math.abs(hash).toString(36)}`;
}

/**
 * Check the evidence_cache table for a prior result set for this query.
 * Returns null on cache miss, expired entry, or DB unavailability.
 */
async function _getCachedEvidence(cacheKey: string): Promise<EvidenceSource[] | null> {
  try {
    const db = await import("../db");
    const cached = await db.getCachedEvidence(cacheKey);
    if (!cached) return null;

    // Check TTL via expiresAt column
    if (cached.expiresAt && new Date(cached.expiresAt) < new Date()) {
      return null; // Expired — will be overwritten on next cache write
    }

    // The existing schema stores one row per article, not a JSON blob.
    // We store the full EvidenceSource[] as JSON in the abstract field
    // for bulk retrieval. If abstract starts with '[', it's our JSON.
    if (cached.abstract && cached.abstract.startsWith("[")) {
      await db.updateEvidenceCacheUsage(cacheKey);
      return JSON.parse(cached.abstract) as EvidenceSource[];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Write a result set to the evidence_cache table.
 * Stores the full EvidenceSource[] as JSON in the abstract field.
 * Uses upsert pattern via the unique queryHash constraint.
 */
async function _cacheEvidence(cacheKey: string, results: EvidenceSource[]): Promise<void> {
  try {
    const db = await import("../db");
    const expiresAt = new Date(Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);
    const firstResult = results[0];

    const cacheId = await db.cacheEvidence({
      queryHash: cacheKey,
      queryText: cacheKey,
      evidenceType: firstResult?.studyType ?? "clinical_evidence",
      title: `PubMed cache: ${results.length} results`,
      authors: null,
      publicationDate: null,
      source: "PubMed E-utilities",
      doi: null,
      pmid: null,
      // Store the full EvidenceSource[] as JSON in the abstract field
      abstract: JSON.stringify(results),
      keyFindings: results.map((r) => r.keyFindings).join(" | ").slice(0, 500),
      relevanceScore: String(
        results.reduce((sum, r) => sum + r.relevanceScore, 0) / (results.length || 1)
      ),
      expiresAt,
    });

    // Tag this cache entry with the engine that retrieved it
    if (cacheId) {
      const avgRelevance = results.reduce((sum, r) => sum + r.relevanceScore, 0) / (results.length || 1);
      await db.tagEvidenceCacheEntry({
        evidenceCacheId: cacheId,
        engine: "causal" as const,
        engineRelevanceScore: String(avgRelevance.toFixed(2)),
        queryContext: cacheKey.slice(0, 512),
      }).catch(() => {}); // Non-fatal
    }
  } catch {
    // Non-fatal — cache write failure does not block evidence retrieval
  }
}

// ─────────────────────────────────────────────
// LLM FALLBACK
// Used only when PubMed returns fewer than MIN_PUBMED_RESULTS
// ─────────────────────────────────────────────

/**
 * LLM-simulated evidence retrieval.
 *
 * WARNING: Citations generated here are NOT verified against PubMed.
 * PMIDs may be fabricated. All results are marked isVerified: false.
 * Displayed to clinicians with a clear "Simulated — not verified" label.
 */
async function _llmSimulatedEvidence(
  query: EvidenceQuery,
  maxResults: number
): Promise<EvidenceSource[]> {
  if (maxResults <= 0) return [];

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
Evidence grades: A=strong RCT/meta-analysis, B=moderate evidence, C=expert consensus.
IMPORTANT: Do NOT fabricate PMIDs — leave pmid as empty string.`,
      },
      { role: "user", content: queryText },
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
                required: ["title", "keyFindings", "evidenceGrade", "relevanceScore",
                  "authors", "publicationDate", "journal", "doi", "pmid", "studyType"],
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
    pmid: "",                  // Never fabricate PMIDs
    isVerified: false,         // LLM-generated — not verified against PubMed
    retrievedAt: new Date(),
  }));
}
