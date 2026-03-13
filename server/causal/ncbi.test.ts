/**
 * NCBI API Key validation test.
 * Verifies the NCBI_API_KEY env var is set and accepted by PubMed E-utilities.
 */
import { describe, it, expect } from "vitest";

const EUTILS_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

describe("NCBI API Key", () => {
  it("NCBI_API_KEY env var is set", () => {
    expect(process.env.NCBI_API_KEY).toBeTruthy();
    expect(process.env.NCBI_API_KEY!.length).toBeGreaterThan(10);
  });

  it("PubMed esearch accepts the API key and returns results", async () => {
    const apiKey = process.env.NCBI_API_KEY!;
    const params = new URLSearchParams({
      db: "pubmed",
      term: '"Hypertension"[MeSH Terms] AND (randomized controlled trial[pt])',
      retmax: "3",
      retmode: "json",
      api_key: apiKey,
    });

    const res = await fetch(`${EUTILS_BASE}/esearch.fcgi?${params}`, {
      headers: { "User-Agent": "DelphicaPhysicianPortal/1.0 (test)" },
      signal: AbortSignal.timeout(10_000),
    });

    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);

    const data = await res.json();
    // A valid API key returns esearchresult with an idlist
    expect(data).toHaveProperty("esearchresult");
    expect(data.esearchresult).toHaveProperty("idlist");
    expect(Array.isArray(data.esearchresult.idlist)).toBe(true);
    expect(data.esearchresult.idlist.length).toBeGreaterThan(0);

    // Confirm no error field (invalid key returns error object)
    expect(data.error).toBeUndefined();
  }, 15_000);
});
