import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  Award, 
  AlertTriangle,
  BarChart3,
  Download,
  Users,
  MessageSquare,
  CheckCircle2,
  Activity
} from "lucide-react";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";

interface ComparisonMetric {
  label: string;
  key: string;
  format: (value: any) => string;
  higherIsBetter: boolean;
}

const COMPARISON_METRICS: ComparisonMetric[] = [
  { label: "Usage Count", key: "usageCount", format: (v) => v?.toString() || "0", higherIsBetter: true },
  { label: "Feedback Rate", key: "feedbackRate", format: (v) => v ? `${Math.round(v)}%` : "0%", higherIsBetter: true },
  { label: "Average Rating", key: "averageRating", format: (v) => v ? v.toFixed(1) : "N/A", higherIsBetter: true },
  { label: "Outcomes Documented", key: "outcomesCount", format: (v) => v?.toString() || "0", higherIsBetter: true },
  { label: "Protocol Adherence", key: "qualityMetrics.averageAdherence", format: (v) => v ? `${Math.round(v)}%` : "N/A", higherIsBetter: true },
  { label: "Time to Resolution (days)", key: "qualityMetrics.averageTimeToResolution", format: (v) => v ? Math.round(v).toString() : "N/A", higherIsBetter: false },
  { label: "Diagnosis Match Rate", key: "qualityMetrics.diagnosisMatchRate", format: (v) => v ? `${Math.round(v)}%` : "N/A", higherIsBetter: true },
  { label: "Patient Satisfaction", key: "qualityMetrics.averagePatientSatisfaction", format: (v) => v ? v.toFixed(1) : "N/A", higherIsBetter: true },
];

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function calculateEffectivenessScore(protocol: any): number {
  let score = 0;
  let maxScore = 0;
  
  // Usage count (0-20 points)
  if (protocol.usageCount) {
    score += Math.min(protocol.usageCount / 10, 20);
  }
  maxScore += 20;
  
  // Feedback rate (0-20 points)
  if (protocol.feedbackRate) {
    score += (protocol.feedbackRate / 100) * 20;
  }
  maxScore += 20;
  
  // Average rating (0-20 points)
  if (protocol.averageRating) {
    score += (protocol.averageRating / 5) * 20;
  }
  maxScore += 20;
  
  // Protocol adherence (0-15 points)
  if (protocol.qualityMetrics?.averageAdherence) {
    score += (protocol.qualityMetrics.averageAdherence / 100) * 15;
  }
  maxScore += 15;
  
  // Diagnosis match rate (0-15 points)
  if (protocol.qualityMetrics?.diagnosisMatchRate) {
    score += (protocol.qualityMetrics.diagnosisMatchRate / 100) * 15;
  }
  maxScore += 15;
  
  // Patient satisfaction (0-10 points)
  if (protocol.qualityMetrics?.averagePatientSatisfaction) {
    score += (protocol.qualityMetrics.averagePatientSatisfaction / 10) * 10;
  }
  maxScore += 10;
  
  return maxScore > 0 ? (score / maxScore) * 100 : 0;
}

export default function ProtocolComparison() {
  const { data: analytics, isLoading } = trpc.protocols.getAnalytics.useQuery();
  const [selectedProtocols, setSelectedProtocols] = useState<string[]>([]);

  const protocols = analytics?.protocolStats || [];

  const toggleProtocol = (protocolId: string) => {
    setSelectedProtocols(prev => 
      prev.includes(protocolId) 
        ? prev.filter(id => id !== protocolId)
        : [...prev, protocolId]
    );
  };

  const comparisonData = useMemo(() => {
    const selected = protocols.filter((p: any) => selectedProtocols.includes(p.protocolId));
    
    return selected.map((protocol: any) => ({
      ...protocol,
      effectivenessScore: calculateEffectivenessScore(protocol)
    })).sort((a: any, b: any) => b.effectivenessScore - a.effectivenessScore);
  }, [protocols, selectedProtocols]);

  const bestPerformer = comparisonData.length > 0 ? comparisonData[0] : null;
  const needsImprovement = comparisonData.length > 0 ? comparisonData[comparisonData.length - 1] : null;

  const insights = useMemo(() => {
    if (comparisonData.length < 2) return [];
    
    const insights: string[] = [];
    
    // Compare feedback rates
    const feedbackRates = comparisonData.map((p: any) => p.feedbackRate || 0);
    const maxFeedback = Math.max(...feedbackRates);
    const minFeedback = Math.min(...feedbackRates);
    if (maxFeedback - minFeedback > 20) {
      const best = comparisonData.find((p: any) => p.feedbackRate === maxFeedback);
      insights.push(`${best?.protocolName} has significantly higher physician feedback rate (${Math.round(maxFeedback)}%), indicating better engagement.`);
    }
    
    // Compare adherence
    const adherenceRates = comparisonData
      .map((p: any) => p.qualityMetrics?.averageAdherence)
      .filter((v: any) => v !== null && v !== undefined);
    if (adherenceRates.length >= 2) {
      const maxAdherence = Math.max(...adherenceRates);
      const minAdherence = Math.min(...adherenceRates);
      if (maxAdherence - minAdherence > 15) {
        const best = comparisonData.find((p: any) => p.qualityMetrics?.averageAdherence === maxAdherence);
        insights.push(`${best?.protocolName} shows superior protocol adherence (${Math.round(maxAdherence)}%), suggesting clearer guidelines or better physician training.`);
      }
    }
    
    // Compare time to resolution
    const resolutionTimes = comparisonData
      .map((p: any) => p.qualityMetrics?.averageTimeToResolution)
      .filter((v: any) => v !== null && v !== undefined);
    if (resolutionTimes.length >= 2) {
      const fastest = Math.min(...resolutionTimes);
      const slowest = Math.max(...resolutionTimes);
      if (slowest - fastest > 5) {
        const best = comparisonData.find((p: any) => p.qualityMetrics?.averageTimeToResolution === fastest);
        insights.push(`${best?.protocolName} achieves faster resolution (${Math.round(fastest)} days vs ${Math.round(slowest)} days), potentially due to more efficient diagnostic pathways.`);
      }
    }
    
    // Compare patient satisfaction
    const satisfactionScores = comparisonData
      .map((p: any) => p.qualityMetrics?.averagePatientSatisfaction)
      .filter((v: any) => v !== null && v !== undefined);
    if (satisfactionScores.length >= 2) {
      const maxSat = Math.max(...satisfactionScores);
      const minSat = Math.min(...satisfactionScores);
      if (maxSat - minSat > 1.5) {
        const best = comparisonData.find((p: any) => p.qualityMetrics?.averagePatientSatisfaction === maxSat);
        insights.push(`${best?.protocolName} has higher patient satisfaction (${maxSat.toFixed(1)}/10), which may correlate with better communication strategies or treatment outcomes.`);
      }
    }
    
    return insights;
  }, [comparisonData]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Activity className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-muted-foreground">Loading protocol data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="h-8 w-8" />
              Protocol Comparison
            </h1>
            <p className="text-muted-foreground mt-1">
              Compare effectiveness metrics across clinical protocols
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/protocols/analytics">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Analytics
              </Button>
            </Link>
            {comparisonData.length > 0 && (
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            )}
          </div>
        </div>

        {/* Protocol Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Protocols to Compare</CardTitle>
            <CardDescription>
              Choose 2 or more protocols to analyze side-by-side
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {protocols.map((protocol: any) => (
                <div
                  key={protocol.protocolId}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedProtocols.includes(protocol.protocolId)
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => toggleProtocol(protocol.protocolId)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedProtocols.includes(protocol.protocolId)}
                      onCheckedChange={() => toggleProtocol(protocol.protocolId)}
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{protocol.protocolName}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {protocol.usageCount} applications • {protocol.feedbackCount} feedback
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Comparison Results */}
        {comparisonData.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Select 2 or more protocols above to start comparison
              </p>
            </CardContent>
          </Card>
        )}

        {comparisonData.length === 1 && (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
              <p className="text-muted-foreground">
                Please select at least one more protocol for comparison
              </p>
            </CardContent>
          </Card>
        )}

        {comparisonData.length >= 2 && (
          <>
            {/* Performance Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bestPerformer && (
                <Card className="border-green-200 bg-green-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-green-800 flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      Best Performer
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <h3 className="font-semibold text-lg text-green-900">{bestPerformer.protocolName}</h3>
                    <p className="text-sm text-green-700 mt-1">
                      Effectiveness Score: {bestPerformer.effectivenessScore.toFixed(1)}/100
                    </p>
                  </CardContent>
                </Card>
              )}

              {needsImprovement && comparisonData.length > 1 && needsImprovement.protocolId !== bestPerformer?.protocolId && (
                <Card className="border-orange-200 bg-orange-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-orange-800 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Needs Improvement
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <h3 className="font-semibold text-lg text-orange-900">{needsImprovement.protocolName}</h3>
                    <p className="text-sm text-orange-700 mt-1">
                      Effectiveness Score: {needsImprovement.effectivenessScore.toFixed(1)}/100
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Metrics Comparison Table */}
            <Card>
              <CardHeader>
                <CardTitle>Side-by-Side Metrics</CardTitle>
                <CardDescription>
                  Detailed comparison of key performance indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold">Metric</th>
                        {comparisonData.map((protocol: any) => (
                          <th key={protocol.protocolId} className="text-center py-3 px-4 font-semibold">
                            {protocol.protocolName}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {COMPARISON_METRICS.map((metric) => {
                        const values = comparisonData.map((p: any) => getNestedValue(p, metric.key));
                        const numericValues = values.filter((v: any) => typeof v === 'number' && !isNaN(v));
                        const bestValue = numericValues.length > 0
                          ? (metric.higherIsBetter ? Math.max(...numericValues) : Math.min(...numericValues))
                          : null;

                        return (
                          <tr key={metric.key} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium text-sm">{metric.label}</td>
                            {comparisonData.map((protocol: any) => {
                              const value = getNestedValue(protocol, metric.key);
                              const isBest = value === bestValue && bestValue !== null;
                              
                              return (
                                <td key={protocol.protocolId} className="text-center py-3 px-4">
                                  <div className="flex items-center justify-center gap-2">
                                    <span className={isBest ? "font-bold text-green-600" : ""}>
                                      {metric.format(value)}
                                    </span>
                                    {isBest && <TrendingUp className="h-4 w-4 text-green-600" />}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                      <tr className="bg-blue-50 font-semibold">
                        <td className="py-3 px-4">Effectiveness Score</td>
                        {comparisonData.map((protocol: any) => (
                          <td key={protocol.protocolId} className="text-center py-3 px-4">
                            <Badge variant={protocol.effectivenessScore >= 70 ? "default" : "secondary"}>
                              {protocol.effectivenessScore.toFixed(1)}/100
                            </Badge>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Visual Comparison Charts */}
            <Card>
              <CardHeader>
                <CardTitle>Visual Comparison</CardTitle>
                <CardDescription>
                  Bar charts showing relative performance across key metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Usage Count Chart */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Usage Count
                    </h4>
                    <div className="space-y-2">
                      {comparisonData.map((protocol: any) => {
                        const maxUsage = Math.max(...comparisonData.map((p: any) => p.usageCount || 0));
                        const percentage = maxUsage > 0 ? ((protocol.usageCount || 0) / maxUsage) * 100 : 0;
                        return (
                          <div key={protocol.protocolId}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="font-medium">{protocol.protocolName}</span>
                              <span className="text-muted-foreground">{protocol.usageCount || 0}</span>
                            </div>
                            <div className="h-8 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-600 transition-all duration-500 flex items-center justify-end pr-2"
                                style={{ width: `${percentage}%` }}
                              >
                                {percentage > 20 && (
                                  <span className="text-xs text-white font-semibold">{Math.round(percentage)}%</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Feedback Rate Chart */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Feedback Rate
                    </h4>
                    <div className="space-y-2">
                      {comparisonData.map((protocol: any) => {
                        const percentage = protocol.feedbackRate || 0;
                        return (
                          <div key={protocol.protocolId}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="font-medium">{protocol.protocolName}</span>
                              <span className="text-muted-foreground">{Math.round(percentage)}%</span>
                            </div>
                            <div className="h-8 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-600 transition-all duration-500 flex items-center justify-end pr-2"
                                style={{ width: `${percentage}%` }}
                              >
                                {percentage > 20 && (
                                  <span className="text-xs text-white font-semibold">{Math.round(percentage)}%</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Protocol Adherence Chart */}
                  {comparisonData.some((p: any) => p.qualityMetrics?.averageAdherence) && (
                    <div>
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Protocol Adherence
                      </h4>
                      <div className="space-y-2">
                        {comparisonData.map((protocol: any) => {
                          const adherence = protocol.qualityMetrics?.averageAdherence || 0;
                          return (
                            <div key={protocol.protocolId}>
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="font-medium">{protocol.protocolName}</span>
                                <span className="text-muted-foreground">{Math.round(adherence)}%</span>
                              </div>
                              <div className="h-8 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-purple-600 transition-all duration-500 flex items-center justify-end pr-2"
                                  style={{ width: `${adherence}%` }}
                                >
                                  {adherence > 20 && (
                                    <span className="text-xs text-white font-semibold">{Math.round(adherence)}%</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Effectiveness Score Chart */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Overall Effectiveness Score
                    </h4>
                    <div className="space-y-2">
                      {comparisonData.map((protocol: any) => {
                        const score = protocol.effectivenessScore;
                        const color = score >= 70 ? 'bg-green-600' : score >= 50 ? 'bg-yellow-600' : 'bg-orange-600';
                        return (
                          <div key={protocol.protocolId}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="font-medium">{protocol.protocolName}</span>
                              <span className="text-muted-foreground">{score.toFixed(1)}/100</span>
                            </div>
                            <div className="h-8 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${color} transition-all duration-500 flex items-center justify-end pr-2`}
                                style={{ width: `${score}%` }}
                              >
                                {score > 20 && (
                                  <span className="text-xs text-white font-semibold">{score.toFixed(0)}/100</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Insights and Recommendations */}
            {insights.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                    Comparative Insights & Recommendations
                  </CardTitle>
                  <CardDescription>
                    Key findings and actionable improvement strategies
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Key Findings */}
                    <div>
                      <h4 className="text-sm font-semibold mb-3 text-blue-900">Key Findings</h4>
                      <ul className="space-y-3">
                        {insights.map((insight, idx) => (
                          <li key={idx} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                            <div className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                              {idx + 1}
                            </div>
                            <p className="text-sm text-gray-700 flex-1">{insight}</p>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Actionable Recommendations */}
                    <div>
                      <h4 className="text-sm font-semibold mb-3 text-green-900">Actionable Recommendations</h4>
                      <div className="space-y-3">
                        {needsImprovement && bestPerformer && needsImprovement.protocolId !== bestPerformer.protocolId && (
                          <>
                            {/* Feedback Rate Recommendation */}
                            {(bestPerformer.feedbackRate || 0) - (needsImprovement.feedbackRate || 0) > 20 && (
                              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-start gap-3">
                                  <MessageSquare className="h-5 w-5 text-green-700 flex-shrink-0 mt-0.5" />
                                  <div className="flex-1">
                                    <h5 className="font-semibold text-sm text-green-900 mb-1">Improve Feedback Collection</h5>
                                    <p className="text-sm text-green-800 mb-2">
                                      {needsImprovement.protocolName} has a {Math.round(needsImprovement.feedbackRate || 0)}% feedback rate compared to {bestPerformer.protocolName}'s {Math.round(bestPerformer.feedbackRate || 0)}%.
                                    </p>
                                    <ul className="text-xs text-green-700 space-y-1 ml-4 list-disc">
                                      <li>Add post-encounter feedback prompts for {needsImprovement.protocolName} users</li>
                                      <li>Simplify feedback forms to reduce physician burden</li>
                                      <li>Send automated reminders 24 hours after protocol application</li>
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Adherence Recommendation */}
                            {bestPerformer.qualityMetrics?.averageAdherence && 
                             needsImprovement.qualityMetrics?.averageAdherence &&
                             bestPerformer.qualityMetrics.averageAdherence - needsImprovement.qualityMetrics.averageAdherence > 15 && (
                              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                                <div className="flex items-start gap-3">
                                  <CheckCircle2 className="h-5 w-5 text-purple-700 flex-shrink-0 mt-0.5" />
                                  <div className="flex-1">
                                    <h5 className="font-semibold text-sm text-purple-900 mb-1">Enhance Protocol Adherence</h5>
                                    <p className="text-sm text-purple-800 mb-2">
                                      {needsImprovement.protocolName} shows {Math.round(needsImprovement.qualityMetrics.averageAdherence)}% adherence vs {Math.round(bestPerformer.qualityMetrics.averageAdherence)}% for {bestPerformer.protocolName}.
                                    </p>
                                    <ul className="text-xs text-purple-700 space-y-1 ml-4 list-disc">
                                      <li>Review {needsImprovement.protocolName} for complexity and simplify steps</li>
                                      <li>Provide additional physician training on {needsImprovement.protocolName} guidelines</li>
                                      <li>Add clinical decision support alerts for missed protocol steps</li>
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Time to Resolution Recommendation */}
                            {bestPerformer.qualityMetrics?.averageTimeToResolution && 
                             needsImprovement.qualityMetrics?.averageTimeToResolution &&
                             needsImprovement.qualityMetrics.averageTimeToResolution - bestPerformer.qualityMetrics.averageTimeToResolution > 5 && (
                              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <div className="flex items-start gap-3">
                                  <Activity className="h-5 w-5 text-yellow-700 flex-shrink-0 mt-0.5" />
                                  <div className="flex-1">
                                    <h5 className="font-semibold text-sm text-yellow-900 mb-1">Accelerate Time to Resolution</h5>
                                    <p className="text-sm text-yellow-800 mb-2">
                                      {needsImprovement.protocolName} takes {Math.round(needsImprovement.qualityMetrics.averageTimeToResolution)} days vs {Math.round(bestPerformer.qualityMetrics.averageTimeToResolution)} days for {bestPerformer.protocolName}.
                                    </p>
                                    <ul className="text-xs text-yellow-700 space-y-1 ml-4 list-disc">
                                      <li>Analyze {bestPerformer.protocolName}'s diagnostic pathways for efficiency best practices</li>
                                      <li>Streamline lab ordering and result turnaround for {needsImprovement.protocolName}</li>
                                      <li>Implement earlier follow-up scheduling to prevent delays</li>
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {/* General Recommendation if no specific gaps */}
                        {(!needsImprovement || !bestPerformer || needsImprovement.protocolId === bestPerformer.protocolId) && (
                          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                            <p className="text-sm text-gray-700">
                              All selected protocols show similar performance. Continue monitoring metrics and gather more data for deeper insights.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
