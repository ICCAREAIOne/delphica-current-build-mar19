import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

/**
 * SVG sparkline — renders a confidence trend line from an array of 0–1 scores.
 * Width: 80px, Height: 28px. No axes, just the trend line.
 */
function Sparkline({ scores, color }: { scores: number[]; color: string }) {
  if (!scores || scores.length < 2) {
    return <span className="text-xs text-muted-foreground italic">no data</span>;
  }
  const W = 80;
  const H = 28;
  const pad = 2;
  const xs = scores.map((_, i) => pad + (i / (scores.length - 1)) * (W - 2 * pad));
  const ys = scores.map((v) => H - pad - v * (H - 2 * pad));
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const lastY = ys[ys.length - 1];
  const lastX = xs[xs.length - 1];
  return (
    <svg width={W} height={H} className="overflow-visible shrink-0">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="2.5" fill={color} />
    </svg>
  );
}

/**
 * Inline sparkline loader — fetches history for a single treatment arm.
 */
function PolicySparkline({
  treatmentCode,
  diagnosisCode,
  ageGroup,
  genderGroup,
  currentScore,
}: {
  treatmentCode: string;
  diagnosisCode: string;
  ageGroup: string;
  genderGroup: string;
  currentScore: number;
}) {
  const { data } = trpc.causalBrain.getPolicyHistory.useQuery(
    { treatmentCode, diagnosisCode, ageGroup, genderGroup, limit: 10 },
    { staleTime: 60_000 }
  );
  const scores = data ? data.map((r) => r.confidenceScore) : [currentScore];
  const color = currentScore >= 0.65 ? "#10b981" : currentScore >= 0.45 ? "#f59e0b" : "#ef4444";
  return <Sparkline scores={scores} color={color} />;
}

// ─── Outcome Definitions Panel ────────────────────────────────────────────────

function OutcomeDefinitionsPanel() {
  const { data: defs = [], isLoading } = trpc.causalBrain.getAllOutcomeDefinitions.useQuery(
    undefined,
    { staleTime: 300_000 }
  );

  const opLabel: Record<string, string> = {
    lt: "<", lte: "≤", gt: ">", gte: "≥", drop_by: "drop ≥", reach: "reach",
  };

  if (isLoading) return <div className="text-muted-foreground text-sm py-8 text-center">Loading definitions…</div>;

  return (
    <div className="rounded-lg border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Code</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Condition</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Instrument</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Success Criterion</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Days</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Guideline</th>
            <th className="text-center px-4 py-3 font-medium text-muted-foreground">Grade</th>
          </tr>
        </thead>
        <tbody>
          {defs.map((d) => (
            <tr key={d.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
              <td className="px-4 py-3">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{d.diagnosisCode}</span>
              </td>
              <td className="px-4 py-3 text-sm">{d.conditionName}</td>
              <td className="px-4 py-3 text-sm">
                {d.measurementInstrument}
                {d.measurementUnit && <span className="text-muted-foreground ml-1">({d.measurementUnit})</span>}
              </td>
              <td className="px-4 py-3 text-sm font-mono">
                {opLabel[d.successOperator] ?? d.successOperator} {d.successThreshold}
              </td>
              <td className="px-4 py-3 text-right text-sm">{d.timeHorizonDays}d</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{d.guidelineSource}</td>
              <td className="px-4 py-3 text-center">
                <Badge variant="outline" className="text-xs font-mono">
                  {d.evidenceGrade}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-muted-foreground px-4 py-2">
        {defs.length} validated outcome definitions · ADA / ACC/AHA / GOLD / ACR / KDIGO / DSM-5 / GINA
      </p>
    </div>
  );
}

// ─── CPT Code Audit Panel ───────────────────────────────────────────────────

function CptAuditPanel() {
  const { data: results = [], isLoading, refetch, isFetching } = trpc.causalBrain.auditTreatmentEntryCPTCodes.useQuery(
    undefined,
    { staleTime: 60_000 }
  );

  const triggerRefresh = trpc.causalBrain.triggerCptRefresh.useMutation();

  const issues  = results.filter((r) => !r.valid);
  const clean   = results.filter((r) => r.valid);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">CPT Code Audit</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Every <code className="text-xs bg-muted px-1 rounded">treatment_entries.treatmentCode</code> is validated
            against the CPT-4 reference table (8,222 codes). Flags invalid, unlicensed, or fabricated procedure codes.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => triggerRefresh.mutate({ force: false })}
            disabled={triggerRefresh.isPending}
            className="text-xs border rounded px-3 py-1.5 hover:bg-muted transition-colors disabled:opacity-50"
          >
            {triggerRefresh.isPending ? 'Refreshing…' : 'Refresh CPT Table'}
          </button>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs border rounded px-3 py-1.5 hover:bg-muted transition-colors disabled:opacity-50"
          >
            {isFetching ? 'Running…' : 'Re-run Audit'}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm py-8 text-center">Running CPT audit…</div>
      ) : results.length === 0 ? (
        <div className="rounded-lg border bg-muted/30 py-12 text-center">
          <p className="text-sm font-medium text-muted-foreground">No treatment entries found</p>
          <p className="text-xs text-muted-foreground mt-1">CPT codes will appear here once treatment entries are recorded.</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="flex gap-4 flex-wrap">
            <div className="rounded-lg border bg-emerald-50 px-4 py-3 min-w-32">
              <p className="text-xs text-emerald-700 font-medium uppercase tracking-wide">Valid CPT Codes</p>
              <p className="text-2xl font-bold text-emerald-800">{clean.length}</p>
            </div>
            <div className="rounded-lg border bg-red-50 px-4 py-3 min-w-32">
              <p className="text-xs text-red-700 font-medium uppercase tracking-wide">Invalid / Not Found</p>
              <p className="text-2xl font-bold text-red-800">{issues.length}</p>
            </div>
            <div className="rounded-lg border bg-muted px-4 py-3 min-w-32">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Entries</p>
              <p className="text-2xl font-bold">{results.length}</p>
            </div>
          </div>

          {/* Issues Table */}
          {issues.length > 0 && (
            <div className="rounded-lg border overflow-x-auto">
              <div className="px-4 py-3 border-b bg-red-50">
                <p className="text-sm font-medium text-red-800">⚠ Invalid CPT Codes — Requiring Correction</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Entry ID</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">CPT Code</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Reason</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Suggested Codes</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map((r) => (
                    <tr key={r.treatmentEntryId} className="border-b last:border-0">
                      <td className="px-4 py-2 font-mono text-xs text-muted-foreground">#{r.treatmentEntryId}</td>
                      <td className="px-4 py-2">
                        <span className="font-mono text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded">{r.cptCode}</span>
                      </td>
                      <td className="px-4 py-2 text-sm text-red-700">{r.reason ?? 'Not found in CPT-4 reference'}</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground font-mono">
                        {r.suggestions?.join(', ') ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Valid Codes Table */}
          {clean.length > 0 && (
            <div className="rounded-lg border overflow-x-auto">
              <div className="px-4 py-3 border-b bg-emerald-50">
                <p className="text-sm font-medium text-emerald-800">✓ Valid CPT Codes ({clean.length})</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Entry ID</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">CPT Code</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Description</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {clean.map((r) => (
                    <tr key={r.treatmentEntryId} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-2 font-mono text-xs text-muted-foreground">#{r.treatmentEntryId}</td>
                      <td className="px-4 py-2">
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{r.cptCode}</span>
                      </td>
                      <td className="px-4 py-2 text-sm text-muted-foreground">{r.cptDescription ?? '—'}</td>
                      <td className="px-4 py-2">
                        <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                          {r.cptCategory ?? 'CPT'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground px-4 py-2">
                Source: CPT-4 public reference · 8,222 codes · Validated at query time
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── ICD-10 Code Audit Panel ─────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  valid:         { label: 'Valid',          color: 'text-emerald-700', bg: 'bg-emerald-50' },
  not_found:     { label: 'Not Found',      color: 'text-red-700',     bg: 'bg-red-50' },
  encounter_code:{ label: 'Encounter Code', color: 'text-orange-700',  bg: 'bg-orange-50' },
  not_billable:  { label: 'Non-Billable',   color: 'text-amber-700',   bg: 'bg-amber-50' },
  external_cause:{ label: 'External Cause', color: 'text-purple-700',  bg: 'bg-purple-50' },
  supplemental:  { label: 'Supplemental',   color: 'text-blue-700',    bg: 'bg-blue-50' },
};

function CodeAuditPanel() {
  const { toast } = useToast();
  const [reviewedIds, setReviewedIds] = useState<Record<number, 'accepted' | 'flagged'>>({});
  const reviewMutation = trpc.causalBrain.reviewOutcomeDefinition.useMutation({
    onSuccess: (_, vars) => {
      setReviewedIds(prev => ({ ...prev, [vars.outcomeDefId]: vars.accepted ? 'accepted' : 'flagged' }));
      toast({ title: vars.accepted ? 'Accepted — review saved' : 'Flagged for correction — review saved' });
    },
    onError: (err) => toast({ title: 'Review failed', description: err.message, variant: 'destructive' }),
  });
  const { data: results = [], isLoading, refetch, isFetching } = trpc.causalBrain.auditOutcomeDefinitionCodes.useQuery(
    undefined,
    { staleTime: 60_000 }
  );

  const issues    = results.filter((r) => r.status !== 'valid');
  const warnings  = results.filter((r) => r.status === 'valid' && r.specificityWarning);
  const clean     = results.filter((r) => r.status === 'valid' && !r.specificityWarning);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">ICD-10-CM Code Audit</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Every <code className="text-xs bg-muted px-1 rounded">outcome_definitions.diagnosisCode</code> is validated
            against the CMS FY2025 ICD-10-CM tabular (71,704 codes).
            Flags non-billable category codes, encounter codes, and codes not in the tabular.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-xs border rounded px-3 py-1.5 hover:bg-muted transition-colors disabled:opacity-50"
        >
          {isFetching ? 'Running…' : 'Re-run Audit'}
        </button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm py-8 text-center">Running audit…</div>
      ) : (
        <>
          {/* Summary */}
          <div className="flex gap-4 flex-wrap">
            <div className="rounded-lg border bg-emerald-50 px-4 py-3 min-w-32">
              <p className="text-xs text-emerald-700 font-medium uppercase tracking-wide">Valid &amp; Specific</p>
              <p className="text-2xl font-bold text-emerald-800">{clean.length}</p>
            </div>
            <div className="rounded-lg border bg-amber-50 px-4 py-3 min-w-32">
              <p className="text-xs text-amber-700 font-medium uppercase tracking-wide">Specificity Warnings</p>
              <p className="text-2xl font-bold text-amber-800">{warnings.length}</p>
            </div>
            <div className="rounded-lg border bg-red-50 px-4 py-3 min-w-32">
              <p className="text-xs text-red-700 font-medium uppercase tracking-wide">Errors</p>
              <p className="text-2xl font-bold text-red-800">{issues.length}</p>
            </div>
            <div className="rounded-lg border bg-muted px-4 py-3 min-w-32">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total</p>
              <p className="text-2xl font-bold">{results.length}</p>
            </div>
          </div>

          {/* Issues Table */}
          {issues.length > 0 && (
            <div className="rounded-lg border overflow-x-auto">
              <div className="px-4 py-3 border-b bg-red-50">
                <p className="text-sm font-medium text-red-800">⚠ Issues Requiring Attention</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Code</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Condition</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Issue</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Suggested Codes</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map((r) => {
                    const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.not_found;
                    return (
                      <tr key={r.outcomeDefId} className="border-b last:border-0">
                        <td className="px-4 py-2">
                          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{r.diagnosisCode}</span>
                        </td>
                        <td className="px-4 py-2 text-sm">{r.conditionName}</td>
                        <td className="px-4 py-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs text-muted-foreground font-mono">
                          {r.suggestedCodes?.join(', ') ?? '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Specificity Warnings Table */}
          {warnings.length > 0 && (
            <div className="rounded-lg border overflow-x-auto">
              <div className="px-4 py-3 border-b bg-amber-50">
                <p className="text-sm font-medium text-amber-800">
                  ⚠ Specificity Warnings — Valid codes but unspecified/NOS ({warnings.length})
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  These codes are structurally valid and billable, but use "unspecified" subtypes.
                  Outcome thresholds may not be clinically appropriate across all subtypes. Physician review recommended.
                </p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Code</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Condition</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">ICD-10-CM Description</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">More Specific Codes</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Sign-off</th>
                  </tr>
                </thead>
                <tbody>
                  {warnings.map((r) => (
                    <tr key={r.outcomeDefId} className="border-b last:border-0 hover:bg-amber-50/50">
                      <td className="px-4 py-2">
                        <span className="font-mono text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">{r.diagnosisCode}</span>
                      </td>
                      <td className="px-4 py-2 text-sm">{r.conditionName}</td>
                      <td className="px-4 py-2 text-sm text-muted-foreground">{r.icdShortDesc}</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {r.specificerCodes && r.specificerCodes.length > 0
                          ? r.specificerCodes.slice(0, 3).join(' · ')
                          : '—'}
                      </td>
                      <td className="px-4 py-2">
                        {reviewedIds[r.outcomeDefId] === 'accepted' ? (
                          <span className="text-xs text-emerald-600 font-medium">✓ Accepted</span>
                        ) : reviewedIds[r.outcomeDefId] === 'flagged' ? (
                          <span className="text-xs text-red-600 font-medium">⚑ Flagged</span>
                        ) : (
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="h-6 text-xs px-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                              onClick={() => reviewMutation.mutate({ outcomeDefId: r.outcomeDefId, accepted: true })}
                              disabled={reviewMutation.isPending}>
                              Accept
                            </Button>
                            <Button size="sm" variant="outline" className="h-6 text-xs px-2 text-red-700 border-red-300 hover:bg-red-50"
                              onClick={() => reviewMutation.mutate({ outcomeDefId: r.outcomeDefId, accepted: false, reviewNote: 'Flagged for correction' })}
                              disabled={reviewMutation.isPending}>
                              Flag
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Valid & Specific Codes Table */}
          <div className="rounded-lg border overflow-x-auto">
            <div className="px-4 py-3 border-b bg-emerald-50">
              <p className="text-sm font-medium text-emerald-800">✓ Valid &amp; Specific Billable Codes ({clean.length})</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Code</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Condition (Outcome Def)</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">ICD-10-CM Description</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Type</th>
                </tr>
              </thead>
              <tbody>
                {clean.map((r) => (
                  <tr key={r.outcomeDefId} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2">
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{r.diagnosisCode}</span>
                    </td>
                    <td className="px-4 py-2 text-sm">{r.conditionName}</td>
                    <td className="px-4 py-2 text-sm text-muted-foreground">{r.icdShortDesc}</td>
                    <td className="px-4 py-2">
                      <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                        {r.codeType ?? 'diagnosis'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground px-4 py-2">
              Source: CMS ICD-10-CM FY2025 tabular · {clean.length} specific + {warnings.length} unspecified = {results.length} total · Validated at query time
            </p>
          </div>
        </>
      )}
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
            Bayesian Beta(α,β) confidence scores per treatment arm with 90-day trend sparklines, stratified by diagnosis, age, and gender.
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
        ) : (
          <Tabs defaultValue="table">
            <TabsList>
              <TabsTrigger value="table">Table View</TabsTrigger>
              <TabsTrigger value="grouped">By Diagnosis</TabsTrigger>
              <TabsTrigger value="outcomes">Outcome Definitions</TabsTrigger>
              <TabsTrigger value="audit">ICD-10 Audit</TabsTrigger>
              <TabsTrigger value="cpt-audit">CPT Audit</TabsTrigger>
            </TabsList>

            {/* Flat Table with Sparklines */}
            <TabsContent value="table" className="mt-4">
              {filtered.length === 0 ? (
                <div className="text-muted-foreground text-sm py-12 text-center">No policy data matches the current filters.</div>
              ) : (
                <>
                  <div className="rounded-lg border overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Diagnosis</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Treatment</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Age</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Gender</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground w-40">Confidence</th>
                          <th className="text-center px-4 py-3 font-medium text-muted-foreground">Trend (90d)</th>
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
                            <td className="px-4 py-3 flex justify-center">
                              <PolicySparkline
                                treatmentCode={p.treatmentCode}
                                diagnosisCode={p.diagnosisCode}
                                ageGroup={p.ageGroup}
                                genderGroup={p.genderGroup}
                                currentScore={p.confidenceScore}
                              />
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
                    α = Beta successes · β = Beta failures · n = total observations · ✓ = improved · ✗ = worsened · Trend = 90-day confidence trajectory
                  </p>
                </>
              )}
            </TabsContent>

            {/* Grouped by Diagnosis */}
            <TabsContent value="grouped" className="mt-4 space-y-6">
              {filtered.length === 0 ? (
                <div className="text-muted-foreground text-sm py-12 text-center">No policy data matches the current filters.</div>
              ) : (
                Object.entries(byDiagnosis).map(([code, rows]) => {
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
                            <PolicySparkline
                              treatmentCode={p.treatmentCode}
                              diagnosisCode={p.diagnosisCode}
                              ageGroup={p.ageGroup}
                              genderGroup={p.genderGroup}
                              currentScore={p.confidenceScore}
                            />
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
                })
              )}
            </TabsContent>

            {/* Outcome Definitions */}
            <TabsContent value="outcomes" className="mt-4">
              <div className="mb-3">
                <h2 className="font-semibold">Validated Outcome Definitions</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Formal success criteria per ICD-10 code used to classify outcomes before updating Bayesian priors.
                  Sources: ADA 2024, ACC/AHA 2017–2022, GOLD 2024, ACR 2021, KDIGO 2022, DSM-5, GINA 2023.
                </p>
              </div>
              <OutcomeDefinitionsPanel />
            </TabsContent>

            {/* ICD-10 Code Audit */}
            <TabsContent value="audit" className="mt-4">
              <CodeAuditPanel />
            </TabsContent>

            {/* CPT Code Audit */}
            <TabsContent value="cpt-audit" className="mt-4">
              <CptAuditPanel />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
