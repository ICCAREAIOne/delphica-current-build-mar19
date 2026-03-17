import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardLayout from "@/components/DashboardLayout";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { Activity, TrendingUp, AlertTriangle, CheckCircle2, Clock, Brain, Target, BarChart2 } from "lucide-react";

const RISK_COLORS: Record<string, string> = {
  low: "#10b981", moderate: "#f59e0b", high: "#ef4444", very_high: "#7c3aed",
};
const ACTION_COLORS: Record<string, string> = {
  explored: "#3b82f6", monitored: "#10b981", dismissed: "#94a3b8", pending: "#f59e0b",
};

function StatCard({ label, value, sub, icon, color, loading }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string; loading?: boolean;
}) {
  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${color} shrink-0`}>{icon}</div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 truncate">{label}</p>
            {loading ? <Skeleton className="h-7 w-16 mt-1" /> : <p className="text-2xl font-bold text-slate-900">{value}</p>}
            {sub && !loading && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OutcomeAnalytics() {
  const { data: allPredictions, isLoading: predsLoading } = trpc.riskPredictions.getAll.useQuery();
  const { data: riskStats, isLoading: statsLoading } = trpc.riskPredictions.getStats.useQuery();
  const { data: outcomeMetrics, isLoading: outcomesLoading } = trpc.analytics.getOutcomeMetrics.useQuery({});
  const { data: recAccuracy, isLoading: recLoading } = trpc.analytics.getRecommendationAccuracy.useQuery({});
  const { data: policyMetrics, isLoading: policyLoading } = trpc.analytics.getPolicyLearningMetrics.useQuery({});

  const isLoading = predsLoading || statsLoading || outcomesLoading || recLoading || policyLoading;

  const riskByCategoryData = useMemo(() => {
    if (!allPredictions) return [];
    const map = new Map<string, { high: number; moderate: number; low: number }>();
    for (const p of allPredictions) {
      const cat = p.diseaseCategory ?? "Other";
      if (!map.has(cat)) map.set(cat, { high: 0, moderate: 0, low: 0 });
      const e = map.get(cat)!;
      if (p.riskLevel === "high" || p.riskLevel === "very_high") e.high++;
      else if (p.riskLevel === "moderate") e.moderate++;
      else e.low++;
    }
    return Array.from(map.entries()).map(([name, v]) => ({ name, ...v }));
  }, [allPredictions]);

  const riskLevelPie = useMemo(() => {
    if (!allPredictions) return [];
    const map = new Map<string, number>();
    for (const p of allPredictions) map.set(p.riskLevel, (map.get(p.riskLevel) ?? 0) + 1);
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [allPredictions]);

  const actionPie = useMemo(() => {
    if (!allPredictions) return [];
    const map = new Map<string, number>();
    for (const p of allPredictions) { const a = p.actionTaken ?? "pending"; map.set(a, (map.get(a) ?? 0) + 1); }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [allPredictions]);

  const recAccuracyData = recAccuracy ? [
    { name: "Accepted", value: recAccuracy.accepted, fill: "#10b981" },
    { name: "Modified", value: recAccuracy.modified, fill: "#f59e0b" },
    { name: "Rejected", value: recAccuracy.rejected, fill: "#ef4444" },
    { name: "Pending", value: recAccuracy.pending, fill: "#94a3b8" },
  ] : [];

  const policyTrendData = useMemo(() => {
    if (!policyMetrics?.effectTrend) return [];
    return policyMetrics.effectTrend.slice(-20).map((t: any) => ({
      date: new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      effectSize: parseFloat(t.effectSize?.toFixed(3) ?? "0"),
    }));
  }, [policyMetrics]);

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Outcome Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">Live data from risk predictions, treatment recommendations, and policy learning engine</p>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total Risk Predictions" value={allPredictions?.length ?? 0}
            sub={`${riskStats?.highRiskCount ?? 0} high-risk`}
            icon={<Brain className="h-5 w-5 text-blue-600" />} color="bg-blue-50" loading={isLoading} />
          <StatCard label="Exploration Rate" value={riskStats ? `${riskStats.explorationRate.toFixed(1)}%` : "—"}
            sub={`${riskStats?.exploredCount ?? 0} explored`}
            icon={<Target className="h-5 w-5 text-emerald-600" />} color="bg-emerald-50" loading={isLoading} />
          <StatCard label="Recommendation Acceptance" value={recAccuracy ? `${recAccuracy.acceptanceRate.toFixed(1)}%` : "—"}
            sub={`${recAccuracy?.total ?? 0} total`}
            icon={<CheckCircle2 className="h-5 w-5 text-violet-600" />} color="bg-violet-50" loading={isLoading} />
          <StatCard label="Outcome Success Rate" value={outcomeMetrics ? `${outcomeMetrics.successRate.toFixed(1)}%` : "—"}
            sub={`${outcomeMetrics?.totalOutcomes ?? 0} outcomes`}
            icon={<TrendingUp className="h-5 w-5 text-amber-600" />} color="bg-amber-50" loading={isLoading} />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-blue-500" /> Risk Predictions by Disease Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-52 w-full" /> : riskByCategoryData.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-slate-400 text-sm">No risk predictions yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={riskByCategoryData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="high" name="High/Very High" fill="#ef4444" stackId="a" />
                    <Bar dataKey="moderate" name="Moderate" fill="#f59e0b" stackId="a" />
                    <Bar dataKey="low" name="Low" fill="#10b981" stackId="a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Activity className="h-4 w-4 text-violet-500" /> Risk Level Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-52 w-full" /> : riskLevelPie.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-slate-400 text-sm">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={riskLevelPie} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {riskLevelPie.map((entry, i) => <Cell key={i} fill={RISK_COLORS[entry.name] ?? "#6b7280"} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Treatment Recommendation Outcomes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-52 w-full" /> : recAccuracyData.every(d => d.value === 0) ? (
                <div className="h-52 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
                  <Clock className="h-8 w-8 opacity-30" />
                  <p>No recommendations recorded yet</p>
                  <p className="text-xs">Run a Framework Workflow to generate recommendations</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={recAccuracyData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {recAccuracyData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
              {recAccuracy && recAccuracy.total > 0 && (
                <div className="flex gap-4 mt-3 text-xs text-slate-500 border-t border-slate-100 pt-3">
                  <span>Acceptance: <strong className="text-emerald-600">{recAccuracy.acceptanceRate.toFixed(1)}%</strong></span>
                  <span>Modification: <strong className="text-amber-600">{recAccuracy.modificationRate.toFixed(1)}%</strong></span>
                  <span>Rejection: <strong className="text-red-600">{recAccuracy.rejectionRate.toFixed(1)}%</strong></span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-500" /> Prediction Action Taken
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-52 w-full" /> : actionPie.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-slate-400 text-sm">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={actionPie} cx="50%" cy="50%" outerRadius={85} paddingAngle={3} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {actionPie.map((entry, i) => <Cell key={i} fill={ACTION_COLORS[entry.name] ?? "#6b7280"} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Brain className="h-4 w-4 text-violet-500" /> Policy Learning Engine — Causal Effect Size Trend
            </CardTitle>
            {policyMetrics && (
              <p className="text-xs text-slate-400">
                {policyMetrics.totalAnalyses} analyses · {policyMetrics.uniqueDiagnoses} diagnoses · Avg effect size: <strong>{policyMetrics.averageEffectSize.toFixed(3)}</strong>
              </p>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-44 w-full" /> : policyTrendData.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
                <Brain className="h-8 w-8 opacity-30" />
                <p>No causal analyses recorded yet</p>
                <p className="text-xs">Run Causal Brain analysis on a patient to populate this chart</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={policyTrendData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={[0, "auto"]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="effectSize" stroke="#7c3aed" strokeWidth={2} dot={false} name="Effect Size" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {outcomeMetrics && outcomeMetrics.totalOutcomes > 0 && (
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Activity className="h-4 w-4 text-amber-500" /> Recorded Patient Outcomes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "Total", value: outcomeMetrics.totalOutcomes, color: "text-slate-700" },
                  { label: "Successful", value: outcomeMetrics.successful, color: "text-emerald-600" },
                  { label: "Adverse Events", value: outcomeMetrics.adverse, color: "text-red-600" },
                  { label: "No Change", value: outcomeMetrics.noChange, color: "text-amber-600" },
                ].map(s => (
                  <div key={s.label} className="text-center p-3 bg-slate-50 rounded-lg">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {!isLoading && (allPredictions?.length ?? 0) === 0 && (
          <Card className="border border-amber-200 bg-amber-50">
            <CardContent className="pt-4 pb-4">
              <div className="flex gap-3 items-start">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800 text-sm">No data yet</p>
                  <p className="text-xs text-amber-700 mt-1">
                    To populate: (1) Open a patient → run Framework Workflow to generate recommendations and outcomes.
                    (2) Use Risk Predictions to import Delphi-2M predictions.
                    (3) Run Causal Brain analysis to feed the policy learning engine.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
