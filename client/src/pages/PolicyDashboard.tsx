import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DIAGNOSIS_LABELS: Record<string, string> = {
  E11: "Type 2 Diabetes (E11)",
  I10: "Hypertension (I10)",
  J44: "COPD (J44)",
  N18: "CKD (N18)",
  F32: "Depression (F32)",
  I48: "Atrial Fibrillation (I48)",
};

const AGE_LABELS: Record<string, string> = {
  under_40: "Under 40",
  "40_to_65": "40–65",
  over_65: "Over 65",
  all: "All Ages",
};

const GENDER_LABELS: Record<string, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
  all: "All Genders",
};

function confidenceBadge(score: number) {
  if (score >= 0.65) return <Badge className="bg-emerald-600 text-white text-xs">{(score * 100).toFixed(0)}%</Badge>;
  if (score >= 0.45) return <Badge className="bg-amber-500 text-white text-xs">{(score * 100).toFixed(0)}%</Badge>;
  return <Badge className="bg-red-600 text-white text-xs">{(score * 100).toFixed(0)}%</Badge>;
}

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = score >= 0.65 ? "bg-emerald-500" : score >= 0.45 ? "bg-amber-400" : "bg-red-500";
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 bg-muted rounded-full h-2 min-w-0">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground w-8 text-right shrink-0">{pct}%</span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PolicyDashboard() {
  const { data: policies = [], isLoading } = trpc.causalBrain.getAllPolicies.useQuery();

  const [selectedDiagnosis, setSelectedDiagnosis] = useState<string>("all");
  const [ageFilter, setAgeFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");

  // Unique diagnosis codes present in the data
  const diagnosisCodes = useMemo(() => {
    const codes = Array.from(new Set(policies.map((p) => p.diagnosisCode))).sort();
    return codes;
  }, [policies]);

  // Filtered + grouped policies
  const filtered = useMemo(() => {
    return policies.filter((p) => {
      if (selectedDiagnosis !== "all" && p.diagnosisCode !== selectedDiagnosis) return false;
      if (ageFilter !== "all" && p.ageGroup !== ageFilter) return false;
      if (genderFilter !== "all" && p.genderGroup !== genderFilter) return false;
      return true;
    });
  }, [policies, selectedDiagnosis, ageFilter, genderFilter]);

  // Group by diagnosis for the overview tab
  const byDiagnosis = useMemo(() => {
    const map: Record<string, typeof policies> = {};
    for (const p of filtered) {
      if (!map[p.diagnosisCode]) map[p.diagnosisCode] = [];
      map[p.diagnosisCode].push(p);
    }
    return map;
  }, [filtered]);

  // Summary stats
  const totalPolicies = filtered.length;
  const totalObservations = filtered.reduce((s, p) => s + (p.totalObservations ?? 0), 0);
  const avgConfidence = filtered.length
    ? filtered.reduce((s, p) => s + p.confidenceScore, 0) / filtered.length
    : 0;
  const highConfidenceCount = filtered.filter((p) => p.confidenceScore >= 0.65).length;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Treatment Policy Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Bayesian Beta distribution confidence scores per treatment arm, stratified by diagnosis, age, and gender.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Policy Arms", value: totalPolicies, sub: "treatment × subgroup rows" },
            { label: "Total Observations", value: totalObservations, sub: "recorded outcomes" },
            { label: "Avg Confidence", value: `${(avgConfidence * 100).toFixed(1)}%`, sub: "across all arms" },
            { label: "High Confidence", value: highConfidenceCount, sub: "arms ≥ 65%" },
          ].map((c) => (
            <div key={c.label} className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{c.label}</p>
              <p className="text-2xl font-bold mt-1">{c.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{c.sub}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={selectedDiagnosis} onValueChange={setSelectedDiagnosis}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="All Diagnoses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Diagnoses</SelectItem>
              {diagnosisCodes.map((code) => (
                <SelectItem key={code} value={code}>
                  {DIAGNOSIS_LABELS[code] ?? code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={ageFilter} onValueChange={setAgeFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Age Group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ages</SelectItem>
              <SelectItem value="under_40">Under 40</SelectItem>
              <SelectItem value="40_to_65">40–65</SelectItem>
              <SelectItem value="over_65">Over 65</SelectItem>
            </SelectContent>
          </Select>

          <Select value={genderFilter} onValueChange={setGenderFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genders</SelectItem>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>

          {(selectedDiagnosis !== "all" || ageFilter !== "all" || genderFilter !== "all") && (
            <button
              onClick={() => { setSelectedDiagnosis("all"); setAgeFilter("all"); setGenderFilter("all"); }}
              className="text-xs text-muted-foreground underline underline-offset-2"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Main Content */}
        {isLoading ? (
          <div className="text-muted-foreground text-sm py-12 text-center">Loading policy data…</div>
        ) : filtered.length === 0 ? (
          <div className="text-muted-foreground text-sm py-12 text-center">No policy data matches the current filters.</div>
        ) : (
          <Tabs defaultValue="table">
            <TabsList>
              <TabsTrigger value="table">Table View</TabsTrigger>
              <TabsTrigger value="grouped">By Diagnosis</TabsTrigger>
            </TabsList>

            {/* Flat Table */}
            <TabsContent value="table" className="mt-4">
              <div className="rounded-lg border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Diagnosis</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Treatment</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Age</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Gender</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground w-40">Confidence</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">α</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">β</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">n</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">✓</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">✗</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{p.diagnosisCode}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{p.treatmentName}</div>
                          <div className="text-xs text-muted-foreground font-mono">{p.treatmentCode}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{AGE_LABELS[p.ageGroup] ?? p.ageGroup}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground capitalize">{GENDER_LABELS[p.genderGroup] ?? p.genderGroup}</td>
                        <td className="px-4 py-3">
                          <ConfidenceBar score={p.confidenceScore} />
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">{p.alpha.toFixed(1)}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">{p.beta.toFixed(1)}</td>
                        <td className="px-4 py-3 text-right text-sm">{p.totalObservations}</td>
                        <td className="px-4 py-3 text-right text-emerald-600 text-sm">{p.successCount}</td>
                        <td className="px-4 py-3 text-right text-red-500 text-sm">{p.failureCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                α = Beta successes parameter · β = Beta failures parameter · n = total observations · ✓ = improved · ✗ = worsened
              </p>
            </TabsContent>

            {/* Grouped by Diagnosis */}
            <TabsContent value="grouped" className="mt-4 space-y-6">
              {Object.entries(byDiagnosis).map(([code, rows]) => {
                const avgConf = rows.reduce((s, r) => s + r.confidenceScore, 0) / rows.length;
                const totalObs = rows.reduce((s, r) => s + (r.totalObservations ?? 0), 0);
                return (
                  <div key={code} className="rounded-lg border">
                    <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                      <div>
                        <span className="font-semibold">{DIAGNOSIS_LABELS[code] ?? code}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{rows.length} arms · {totalObs} observations</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Avg confidence:</span>
                        {confidenceBadge(avgConf)}
                      </div>
                    </div>
                    <div className="divide-y">
                      {rows.map((p) => (
                        <div key={p.id} className="px-4 py-3 flex items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{p.treatmentName}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {AGE_LABELS[p.ageGroup] ?? p.ageGroup} · {GENDER_LABELS[p.genderGroup] ?? p.genderGroup} · n={p.totalObservations}
                            </div>
                          </div>
                          <div className="w-36 shrink-0">
                            <ConfidenceBar score={p.confidenceScore} />
                          </div>
                          <div className="shrink-0">
                            {confidenceBadge(p.confidenceScore)}
                          </div>
                          <div className="text-xs text-muted-foreground shrink-0 font-mono">
                            α={p.alpha.toFixed(1)} β={p.beta.toFixed(1)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
