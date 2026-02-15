import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Loader2,
  BarChart3,
  LineChart,
  PieChart,
  Download
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function OutcomeAnalytics() {
  const { user } = useAuth();
  const [timeFilter, setTimeFilter] = useState("30");
  const [diagnosisFilter, setDiagnosisFilter] = useState("all");

  // Mock data - in production, these would come from tRPC queries
  const overallMetrics = {
    totalOutcomes: 156,
    successRate: 87.2,
    aiAccuracy: 91.5,
    avgRecoveryTime: 14.3,
    improvementTrend: 5.2,
  };

  const outcomesByCategory = [
    { category: "Diabetes Management", total: 45, successful: 42, aiAccurate: 41, successRate: 93.3 },
    { category: "Hypertension Control", total: 38, successful: 34, aiAccurate: 35, successRate: 89.5 },
    { category: "Cardiac Care", total: 27, successful: 22, aiAccurate: 24, successRate: 81.5 },
    { category: "Respiratory Conditions", total: 25, successful: 21, aiAccurate: 22, successRate: 84.0 },
    { category: "Pain Management", total: 21, successful: 17, aiAccurate: 18, successRate: 81.0 },
  ];

  const recentOutcomes = [
    {
      id: 1,
      patientName: "John Smith",
      diagnosis: "Type 2 Diabetes",
      aiPrediction: "HbA1c reduction to <7% in 3 months",
      actualOutcome: "HbA1c 6.8% achieved in 2.5 months",
      status: "success",
      accuracy: 95,
      date: new Date(2026, 1, 10),
    },
    {
      id: 2,
      patientName: "Mary Johnson",
      diagnosis: "Hypertension",
      aiPrediction: "BP control <130/80 in 6 weeks",
      actualOutcome: "BP 128/78 achieved in 5 weeks",
      status: "success",
      accuracy: 92,
      date: new Date(2026, 1, 8),
    },
    {
      id: 3,
      patientName: "Robert Williams",
      diagnosis: "Acute Bronchitis",
      aiPrediction: "Full recovery in 10 days",
      actualOutcome: "Recovery took 14 days",
      status: "partial",
      accuracy: 75,
      date: new Date(2026, 1, 5),
    },
    {
      id: 4,
      patientName: "Sarah Davis",
      diagnosis: "Chronic Back Pain",
      aiPrediction: "50% pain reduction in 4 weeks",
      actualOutcome: "60% pain reduction in 3 weeks",
      status: "success",
      accuracy: 98,
      date: new Date(2026, 1, 3),
    },
    {
      id: 5,
      patientName: "Michael Brown",
      diagnosis: "Atrial Fibrillation",
      aiPrediction: "Rhythm control with medication",
      actualOutcome: "Required cardioversion procedure",
      status: "revised",
      accuracy: 65,
      date: new Date(2026, 0, 28),
    },
  ];

  const feedbackLoopMetrics = {
    totalFeedback: 156,
    positiveImpact: 142,
    modelUpdates: 8,
    accuracyImprovement: 3.2,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="outline" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                  <TrendingUp className="h-8 w-8" />
                  Outcome Analytics Dashboard
                </h1>
                <p className="text-muted-foreground mt-1">
                  AI treatment performance and marketplace feedback loop
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container py-8">
        {/* Overview Metrics */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Outcomes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{overallMetrics.totalOutcomes}</div>
              <p className="text-xs text-muted-foreground mt-1">Documented cases</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{overallMetrics.successRate}%</div>
              <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                <TrendingUp className="h-3 w-3" />
                +{overallMetrics.improvementTrend}% vs last period
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">AI Accuracy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{overallMetrics.aiAccuracy}%</div>
              <p className="text-xs text-muted-foreground mt-1">Prediction accuracy</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Recovery</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{overallMetrics.avgRecoveryTime}</div>
              <p className="text-xs text-muted-foreground mt-1">Days to outcome</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Model Updates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{feedbackLoopMetrics.modelUpdates}</div>
              <p className="text-xs text-muted-foreground mt-1">From feedback loop</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="outcomes" className="space-y-6">
          <TabsList>
            <TabsTrigger value="outcomes">
              <BarChart3 className="h-4 w-4 mr-2" />
              Outcome Analysis
            </TabsTrigger>
            <TabsTrigger value="comparison">
              <LineChart className="h-4 w-4 mr-2" />
              Predicted vs Actual
            </TabsTrigger>
            <TabsTrigger value="feedback">
              <Activity className="h-4 w-4 mr-2" />
              Feedback Loop
            </TabsTrigger>
          </TabsList>

          {/* Outcomes Tab */}
          <TabsContent value="outcomes" className="space-y-6">
            {/* Outcomes by Category */}
            <Card>
              <CardHeader>
                <CardTitle>Outcomes by Clinical Category</CardTitle>
                <CardDescription>Treatment success rates across different conditions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {outcomesByCategory.map((category) => (
                    <div key={category.category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{category.category}</p>
                          <p className="text-sm text-muted-foreground">
                            {category.successful}/{category.total} successful • AI accurate: {category.aiAccurate}/{category.total}
                          </p>
                        </div>
                        <Badge variant={category.successRate >= 90 ? "default" : category.successRate >= 80 ? "secondary" : "outline"}>
                          {category.successRate}%
                        </Badge>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all"
                          style={{ width: `${category.successRate}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Outcomes */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Clinical Outcomes</CardTitle>
                <CardDescription>Latest documented treatment results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentOutcomes.map((outcome) => (
                    <div key={outcome.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{outcome.patientName}</p>
                          <p className="text-sm text-muted-foreground">{outcome.diagnosis}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {outcome.status === "success" && (
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Success
                            </Badge>
                          )}
                          {outcome.status === "partial" && (
                            <Badge variant="secondary">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Partial
                            </Badge>
                          )}
                          {outcome.status === "revised" && (
                            <Badge variant="outline">
                              <XCircle className="h-3 w-3 mr-1" />
                              Revised
                            </Badge>
                          )}
                          <Badge variant="outline">{outcome.accuracy}% accurate</Badge>
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground mb-1">AI Prediction:</p>
                          <p className="font-medium">{outcome.aiPrediction}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Actual Outcome:</p>
                          <p className="font-medium">{outcome.actualOutcome}</p>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Documented: {format(outcome.date, "MMM d, yyyy")}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Comparison Tab */}
          <TabsContent value="comparison" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Predicted vs Actual Outcomes</CardTitle>
                <CardDescription>Comparing AI predictions with real-world results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="p-6 bg-muted rounded-lg text-center">
                    <LineChart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-semibold mb-2">Time-Series Comparison Chart</p>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      Interactive visualization showing predicted outcomes vs actual results over time.
                      This would display trend lines, confidence intervals, and accuracy metrics.
                    </p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Better Than Predicted</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">42%</div>
                        <p className="text-xs text-muted-foreground">Outcomes exceeded AI predictions</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">As Predicted</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-600">45%</div>
                        <p className="text-xs text-muted-foreground">Outcomes matched predictions</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Below Predicted</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-orange-600">13%</div>
                        <p className="text-xs text-muted-foreground">Outcomes below predictions</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Feedback Loop Tab */}
          <TabsContent value="feedback" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Marketplace Entry Feedback Loop</CardTitle>
                <CardDescription>How outcome data improves the Causal Brain's learning</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{feedbackLoopMetrics.totalFeedback}</div>
                    <p className="text-sm text-muted-foreground mt-1">Total Feedback Entries</p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{feedbackLoopMetrics.positiveImpact}</div>
                    <p className="text-sm text-muted-foreground mt-1">Positive Impact Cases</p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{feedbackLoopMetrics.modelUpdates}</div>
                    <p className="text-sm text-muted-foreground mt-1">Model Updates Applied</p>
                  </div>
                  <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">+{feedbackLoopMetrics.accuracyImprovement}%</div>
                    <p className="text-sm text-muted-foreground mt-1">Accuracy Improvement</p>
                  </div>
                </div>

                <div className="p-6 border-2 border-dashed rounded-lg">
                  <div className="text-center space-y-4">
                    <Activity className="h-12 w-12 mx-auto text-primary" />
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Continuous Learning Cycle</h3>
                      <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                        Every documented outcome feeds back into the Causal Brain, refining its policy learning algorithms.
                        This creates a virtuous cycle where real-world results continuously improve AI predictions and
                        treatment recommendations.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-blue-600"></div>
                        <span>Data Collection</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-purple-600"></div>
                        <span>Model Training</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-green-600"></div>
                        <span>Improved Predictions</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent Model Improvements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">Diabetes Treatment Protocol Updated</p>
                          <p className="text-xs text-muted-foreground">
                            Improved HbA1c prediction accuracy by 4.2% based on 45 recent outcomes
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Applied: Feb 10, 2026</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">Hypertension Medication Dosing Refined</p>
                          <p className="text-xs text-muted-foreground">
                            Enhanced blood pressure control predictions based on 38 feedback entries
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Applied: Feb 5, 2026</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">Cardiac Risk Stratification Enhanced</p>
                          <p className="text-xs text-muted-foreground">
                            Better identification of high-risk patients from 27 cardiac care outcomes
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Applied: Jan 28, 2026</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
