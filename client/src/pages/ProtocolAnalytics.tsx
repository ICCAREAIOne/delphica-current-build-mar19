import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, TrendingUp, Users, MessageSquare, CheckCircle2, Activity, BarChart3 } from "lucide-react";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";

export default function ProtocolAnalytics() {
  const { data: analytics, isLoading } = trpc.protocols.getAnalytics.useQuery();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Activity className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-muted-foreground">Loading protocol analytics...</p>
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
              Protocol Analytics
            </h1>
            <p className="text-muted-foreground mt-1">
              Track usage, feedback, and clinical outcomes across all protocols
            </p>
          </div>
          <Link href="/library">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Library
            </Button>
          </Link>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Protocols
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analytics?.totalProtocols || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Applications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analytics?.totalApplications || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Feedback Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {analytics?.averageFeedbackRate ? `${Math.round(analytics.averageFeedbackRate)}%` : "N/A"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Rating
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {analytics?.averageRating ? analytics.averageRating.toFixed(1) : "N/A"}
                <span className="text-lg text-muted-foreground">/5.0</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Per-Protocol Analytics */}
        <Card>
          <CardHeader>
            <CardTitle>Protocol Performance</CardTitle>
            <CardDescription>
              Detailed metrics for each clinical protocol
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analytics?.protocolStats && analytics.protocolStats.length > 0 ? (
              <div className="space-y-6">
                {analytics.protocolStats.map((protocol: any) => (
                  <div key={protocol.protocolId} className="border rounded-lg p-6">
                    {/* Protocol Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{protocol.protocolName}</h3>
                        <p className="text-sm text-muted-foreground">ID: {protocol.protocolId}</p>
                      </div>
                      <Link href={`/protocols/${protocol.protocolId}`}>
                        <Button variant="outline" size="sm">
                          View Protocol
                        </Button>
                      </Link>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-blue-700 mb-1">
                          <Users className="h-4 w-4" />
                          <span className="text-sm font-medium">Applications</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-900">{protocol.usageCount}</div>
                      </div>

                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-green-700 mb-1">
                          <MessageSquare className="h-4 w-4" />
                          <span className="text-sm font-medium">Feedback Rate</span>
                        </div>
                        <div className="text-2xl font-bold text-green-900">
                          {protocol.feedbackRate ? `${Math.round(protocol.feedbackRate)}%` : "0%"}
                        </div>
                        <div className="text-xs text-green-700 mt-1">
                          {protocol.feedbackCount} of {protocol.usageCount} users
                        </div>
                      </div>

                      <div className="bg-yellow-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-yellow-700 mb-1">
                          <TrendingUp className="h-4 w-4" />
                          <span className="text-sm font-medium">Avg Rating</span>
                        </div>
                        <div className="text-2xl font-bold text-yellow-900">
                          {protocol.averageRating ? protocol.averageRating.toFixed(1) : "N/A"}
                          {protocol.averageRating && <span className="text-sm text-yellow-700">/5.0</span>}
                        </div>
                      </div>

                      <div className="bg-purple-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-purple-700 mb-1">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-sm font-medium">Outcomes</span>
                        </div>
                        <div className="text-2xl font-bold text-purple-900">{protocol.outcomesCount}</div>
                        <div className="text-xs text-purple-700 mt-1">documented</div>
                      </div>
                    </div>

                    {/* Clinical Outcomes Breakdown */}
                    {protocol.outcomes && protocol.outcomes.length > 0 && (
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-semibold mb-3">Clinical Outcomes</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {protocol.outcomes.map((outcome: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="text-sm text-muted-foreground capitalize">
                                {outcome.type.replace(/_/g, " ")}
                              </span>
                              <Badge variant="secondary">{outcome.count}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quality Metrics */}
                    {protocol.qualityMetrics && (
                      <div className="border-t pt-4 mt-4">
                        <h4 className="text-sm font-semibold mb-3">Quality Metrics</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {protocol.qualityMetrics.averageAdherence !== null && (
                            <div className="text-center p-3 bg-gray-50 rounded">
                              <div className="text-2xl font-bold text-blue-600">
                                {Math.round(protocol.qualityMetrics.averageAdherence)}%
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">Protocol Adherence</div>
                            </div>
                          )}
                          {protocol.qualityMetrics.averageTimeToResolution !== null && (
                            <div className="text-center p-3 bg-gray-50 rounded">
                              <div className="text-2xl font-bold text-green-600">
                                {Math.round(protocol.qualityMetrics.averageTimeToResolution)}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">Avg Days to Resolution</div>
                            </div>
                          )}
                          {protocol.qualityMetrics.diagnosisMatchRate !== null && (
                            <div className="text-center p-3 bg-gray-50 rounded">
                              <div className="text-2xl font-bold text-purple-600">
                                {Math.round(protocol.qualityMetrics.diagnosisMatchRate)}%
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">Diagnosis Match Rate</div>
                            </div>
                          )}
                          {protocol.qualityMetrics.averagePatientSatisfaction !== null && (
                            <div className="text-center p-3 bg-gray-50 rounded">
                              <div className="text-2xl font-bold text-yellow-600">
                                {protocol.qualityMetrics.averagePatientSatisfaction.toFixed(1)}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">Patient Satisfaction (1-10)</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No protocol usage data available yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Apply protocols to patient encounters to start tracking analytics
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
