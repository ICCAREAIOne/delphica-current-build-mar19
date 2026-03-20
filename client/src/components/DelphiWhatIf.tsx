import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  Legend,
} from "recharts";
import {
  Brain,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Zap,
  Clock,
  Shield,
} from "lucide-react";

interface DelphiWhatIfProps {
  patientId: number;
}

const CONFIDENCE_COLOR = (score: number) => {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-500";
};

const CONFIDENCE_BG = (score: number) => {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  return "bg-red-500";
};

function ScenarioCard({ scenario, isSelected, onSelect }: {
  scenario: any;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const options = useMemo(() => {
    if (!scenario.treatmentOptions) return [];
    try {
      return Array.isArray(scenario.treatmentOptions)
        ? scenario.treatmentOptions
        : JSON.parse(scenario.treatmentOptions);
    } catch {
      return [];
    }
  }, [scenario.treatmentOptions]);

  const topOption = options[0];
  const avgConfidence = options.length
    ? Math.round(options.reduce((s: number, o: any) => s + (o.confidence || 0) * 100, 0) / options.length)
    : 0;

  return (
    <div
      className={`border rounded-lg overflow-hidden transition-all ${
        isSelected ? "border-blue-500 ring-2 ring-blue-200" : "hover:border-blue-200"
      }`}
    >
      {/* Header */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-sm">{scenario.scenarioDescription}</h4>
              {scenario.selectedOption && (
                <Badge variant="default" className="text-xs bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Physician Selected
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(scenario.createdAt).toLocaleDateString("en-US", {
                year: "numeric", month: "short", day: "numeric"
              })}
              {" · "}{options.length} treatment option{options.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <p className={`text-sm font-bold ${CONFIDENCE_COLOR(avgConfidence)}`}>
                {avgConfidence}%
              </p>
              <p className="text-xs text-muted-foreground">confidence</p>
            </div>
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>

        {/* Quick summary of top option */}
        {topOption && !expanded && (
          <div className="mt-3 bg-muted/50 rounded p-2 text-xs">
            <span className="font-medium">Top option: </span>
            {topOption.option} — {topOption.predictedOutcome}
          </div>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-4">
          {/* AI Analysis */}
          {scenario.aiAnalysis && (
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-semibold text-blue-700">AI Analysis</span>
              </div>
              <p className="text-xs text-blue-800 leading-relaxed">{scenario.aiAnalysis}</p>
            </div>
          )}

          {/* Treatment Options Comparison */}
          {options.length > 0 && (
            <div className="space-y-3">
              <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Treatment Options Compared
              </h5>
              {options.map((opt: any, i: number) => (
                <div
                  key={i}
                  className={`border rounded-lg p-3 ${
                    scenario.selectedOption === opt.option
                      ? "border-green-400 bg-green-50"
                      : "bg-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="font-medium text-sm">{opt.option}</span>
                      {scenario.selectedOption === opt.option && (
                        <Badge className="text-xs bg-green-600">Selected</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`text-sm font-bold ${CONFIDENCE_COLOR(Math.round((opt.confidence || 0) * 100))}`}>
                        {Math.round((opt.confidence || 0) * 100)}%
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mb-2">{opt.description}</p>

                  <div className="mb-2">
                    <p className="text-xs font-medium mb-1 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      Predicted outcome
                    </p>
                    <p className="text-xs bg-white rounded p-2 border">{opt.predictedOutcome}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {opt.benefits?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-green-700 mb-1 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Benefits
                        </p>
                        <ul className="space-y-0.5">
                          {opt.benefits.slice(0, 3).map((b: string, j: number) => (
                            <li key={j} className="text-xs text-muted-foreground flex items-start gap-1">
                              <span className="text-green-500 mt-0.5">·</span> {b}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {opt.risks?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-red-600 mb-1 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Risks
                        </p>
                        <ul className="space-y-0.5">
                          {opt.risks.slice(0, 3).map((r: string, j: number) => (
                            <li key={j} className="text-xs text-muted-foreground flex items-start gap-1">
                              <span className="text-red-400 mt-0.5">·</span> {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Confidence bar */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">AI Confidence</span>
                      <span className="text-xs font-medium">{Math.round((opt.confidence || 0) * 100)}%</span>
                    </div>
                    <Progress value={Math.round((opt.confidence || 0) * 100)} className="h-1.5" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Comparison chart */}
          {options.length > 1 && (
            <div>
              <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Confidence Comparison
              </h5>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart
                  data={options.map((o: any, i: number) => ({
                    name: `Option ${i + 1}`,
                    confidence: Math.round((o.confidence || 0) * 100),
                  }))}
                  margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
                  <Tooltip formatter={(v: any) => [`${v}%`, "Confidence"]} />
                  <Bar dataKey="confidence" radius={[4, 4, 0, 0]}>
                    {options.map((_: any, i: number) => (
                      <Cell
                        key={i}
                        fill={i === 0 ? "#6366f1" : i === 1 ? "#10b981" : "#f59e0b"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DelphiWhatIf({ patientId }: DelphiWhatIfProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: simulations, isLoading } = trpc.delphi.listByPatient.useQuery(
    { patientId },
    { enabled: !!patientId }
  );

  const sorted = useMemo(() => {
    if (!simulations) return [];
    return [...simulations].sort(
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [simulations]);

  const stats = useMemo(() => {
    if (!sorted.length) return null;
    const withSelection = sorted.filter((s: any) => s.selectedOption);
    const allOptions = sorted.flatMap((s: any) => {
      try {
        return Array.isArray(s.treatmentOptions) ? s.treatmentOptions : JSON.parse(s.treatmentOptions || "[]");
      } catch { return []; }
    });
    const avgConf = allOptions.length
      ? Math.round(allOptions.reduce((sum: number, o: any) => sum + (o.confidence || 0) * 100, 0) / allOptions.length)
      : 0;
    return {
      total: sorted.length,
      decided: withSelection.length,
      pending: sorted.length - withSelection.length,
      avgConfidence: avgConf,
    };
  }, [sorted]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            Treatment What-If Scenarios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center text-muted-foreground">
            Loading scenarios...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-500" />
          Treatment What-If Scenarios
        </CardTitle>
        <CardDescription>
          AI-generated treatment comparisons from your physician's Delphi Simulator analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-4 gap-3">
            <div className="border rounded-lg p-3 text-center">
              <div className="flex items-center justify-center mb-1">
                <Zap className="h-4 w-4 text-purple-500" />
              </div>
              <p className="text-xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Scenarios</p>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="flex items-center justify-center mb-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
              <p className="text-xl font-bold text-green-600">{stats.decided}</p>
              <p className="text-xs text-muted-foreground">Decided</p>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="flex items-center justify-center mb-1">
                <Clock className="h-4 w-4 text-yellow-500" />
              </div>
              <p className="text-xl font-bold text-yellow-600">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="flex items-center justify-center mb-1">
                <Shield className="h-4 w-4 text-blue-500" />
              </div>
              <p className={`text-xl font-bold ${CONFIDENCE_COLOR(stats.avgConfidence)}`}>
                {stats.avgConfidence}%
              </p>
              <p className="text-xs text-muted-foreground">Avg Confidence</p>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            These scenarios are AI-generated decision-support tools for your physician's review.
            All treatment decisions are made by your physician based on your complete clinical picture.
          </p>
        </div>

        {/* Scenario list */}
        {sorted.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Brain className="h-10 w-10 opacity-30" />
            <p className="text-sm">No treatment scenarios generated yet</p>
            <p className="text-xs">Your physician will run Delphi simulations during your consultations</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((sim: any) => (
              <ScenarioCard
                key={sim.id}
                scenario={sim}
                isSelected={selectedId === sim.id}
                onSelect={() => setSelectedId(selectedId === sim.id ? null : sim.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
