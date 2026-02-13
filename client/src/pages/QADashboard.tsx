import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  CheckCircle2, 
  AlertTriangle,
  Info,
  FileText,
  Code,
  Target,
  DollarSign,
  BarChart3,
  Lightbulb,
  ArrowRight
} from "lucide-react";
import { Link } from "wouter";

export default function QADashboard() {
  const { user } = useAuth();

  // Sample data - in production, this would come from trpc.qa queries
  const overallMetrics = {
    overallQualityScore: 87,
    documentationQuality: 89,
    codingAccuracy: 85,
    reimbursementOptimization: 87,
    totalEncounters: 156,
    accuracyTrend: "improving" as const,
    qualityTrend: "stable" as const,
  };

  const recentMetrics = [
    { date: "2026-02-13", score: 87, encounters: 8 },
    { date: "2026-02-12", score: 85, encounters: 12 },
    { date: "2026-02-11", score: 83, encounters: 10 },
    { date: "2026-02-10", score: 86, encounters: 9 },
    { date: "2026-02-09", score: 84, encounters: 11 },
  ];

  const suggestions = [
    {
      category: "documentation",
      priority: "high",
      issue: "Missing HPI elements in 15% of encounters",
      recommendation: "Include onset, duration, and aggravating factors for all chief complaints",
      potentialImpact: "Improved code specificity and compliance"
    },
    {
      category: "coding",
      priority: "high",
      issue: "Using non-specific ICD-10 codes when more specific codes available",
      recommendation: "Review laterality and anatomical specificity in musculoskeletal diagnoses",
      potentialImpact: "+$45 average per encounter"
    },
    {
      category: "reimbursement",
      priority: "medium",
      issue: "Undercoding E&M levels based on documentation complexity",
      recommendation: "Document medical decision making complexity to support higher-level codes",
      potentialImpact: "+12% reimbursement potential"
    },
    {
      category: "specificity",
      priority: "medium",
      issue: "Vague symptom descriptions in physical exam",
      recommendation: "Use specific measurements (e.g., '3cm tender mass' vs 'mass present')",
      potentialImpact: "Better AI analysis and treatment recommendations"
    }
  ];

  const strengthAreas = [
    { area: "Procedure Documentation", score: 94 },
    { area: "Medication Reconciliation", score: 91 },
    { area: "Follow-up Planning", score: 89 }
  ];

  const improvementAreas = [
    {
      area: "HPI Completeness",
      currentScore: 78,
      targetScore: 90,
      actionItems: [
        "Use HPI template to ensure all elements captured",
        "Document timing and duration for all symptoms",
        "Include patient's description of severity"
      ]
    },
    {
      area: "Code Specificity",
      currentScore: 82,
      targetScore: 92,
      actionItems: [
        "Review ICD-10 code specificity guidelines",
        "Always include laterality when applicable",
        "Use combination codes when available"
      ]
    }
  ];

  const getTrendIcon = (trend: "improving" | "stable" | "declining") => {
    if (trend === "improving") return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend === "declining") return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  const getPriorityBadge = (priority: string) => {
    if (priority === "high") return <Badge variant="destructive">High Priority</Badge>;
    if (priority === "medium") return <Badge variant="default">Medium</Badge>;
    return <Badge variant="secondary">Low</Badge>;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "documentation": return <FileText className="h-4 w-4" />;
      case "coding": return <Code className="h-4 w-4" />;
      case "reimbursement": return <DollarSign className="h-4 w-4" />;
      case "specificity": return <Target className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Quality Assurance Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Coding accuracy metrics and documentation improvement insights
              </p>
            </div>
            <Link href="/">
              <Button variant="outline">
                <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
                Back to Portal
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container py-8">
        {/* Overall Metrics */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Overall Quality Score</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{overallMetrics.overallQualityScore}%</div>
              <Progress value={overallMetrics.overallQualityScore} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                Based on {overallMetrics.totalEncounters} encounters
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Documentation Quality</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{overallMetrics.documentationQuality}%</div>
              <Progress value={overallMetrics.documentationQuality} className="mt-2" />
              <div className="flex items-center gap-1 mt-2">
                {getTrendIcon(overallMetrics.qualityTrend)}
                <p className="text-xs text-muted-foreground capitalize">
                  {overallMetrics.qualityTrend}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Coding Accuracy</CardTitle>
              <Code className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{overallMetrics.codingAccuracy}%</div>
              <Progress value={overallMetrics.codingAccuracy} className="mt-2" />
              <div className="flex items-center gap-1 mt-2">
                {getTrendIcon(overallMetrics.accuracyTrend)}
                <p className="text-xs text-muted-foreground capitalize">
                  {overallMetrics.accuracyTrend}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Reimbursement Optimization</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{overallMetrics.reimbursementOptimization}%</div>
              <Progress value={overallMetrics.reimbursementOptimization} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                Potential gain: $2,340/month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="suggestions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="suggestions">
              <Lightbulb className="h-4 w-4 mr-2" />
              Suggestions
            </TabsTrigger>
            <TabsTrigger value="trends">
              <TrendingUp className="h-4 w-4 mr-2" />
              Trends
            </TabsTrigger>
            <TabsTrigger value="strengths">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Strengths
            </TabsTrigger>
            <TabsTrigger value="improvements">
              <Target className="h-4 w-4 mr-2" />
              Improvements
            </TabsTrigger>
          </TabsList>

          {/* Suggestions Tab */}
          <TabsContent value="suggestions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Actionable Improvement Suggestions</CardTitle>
                <CardDescription>
                  Prioritized recommendations to optimize documentation and coding quality
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {suggestions.map((suggestion, index) => (
                  <Card key={index} className="border-l-4" style={{
                    borderLeftColor: suggestion.priority === "high" ? "hsl(var(--destructive))" : 
                                    suggestion.priority === "medium" ? "hsl(var(--primary))" : 
                                    "hsl(var(--muted))"
                  }}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(suggestion.category)}
                          <CardTitle className="text-base capitalize">{suggestion.category}</CardTitle>
                        </div>
                        {getPriorityBadge(suggestion.priority)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Issue:</p>
                        <p className="text-sm">{suggestion.issue}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Recommendation:</p>
                        <p className="text-sm">{suggestion.recommendation}</p>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <Badge variant="outline" className="text-xs">
                          <Target className="h-3 w-3 mr-1" />
                          {suggestion.potentialImpact}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Quality Score Trends</CardTitle>
                <CardDescription>Recent performance over the last 5 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentMetrics.map((metric, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className="w-24 text-sm text-muted-foreground">{metric.date}</div>
                      <div className="flex-1">
                        <Progress value={metric.score} className="h-2" />
                      </div>
                      <div className="w-16 text-sm font-medium">{metric.score}%</div>
                      <div className="w-24 text-xs text-muted-foreground">{metric.encounters} encounters</div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <p className="font-medium">Improving Trend Detected</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your overall quality score has improved by 4% over the past week. Keep up the great work!
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Strengths Tab */}
          <TabsContent value="strengths" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Strength Areas</CardTitle>
                <CardDescription>Areas where you excel in documentation and coding</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {strengthAreas.map((strength, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <p className="font-medium">{strength.area}</p>
                      </div>
                      <p className="text-2xl font-bold text-green-600">{strength.score}%</p>
                    </div>
                    <Progress value={strength.score} className="h-2" />
                  </div>
                ))}
                <div className="mt-6 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-900 dark:text-green-100">
                    <strong>Excellent work!</strong> Your strong documentation in these areas serves as a model for other clinical workflows. Consider sharing your best practices with colleagues.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Improvements Tab */}
          <TabsContent value="improvements" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Focus Areas for Improvement</CardTitle>
                <CardDescription>Targeted action plans to reach your quality goals</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {improvementAreas.map((area, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{area.area}</CardTitle>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Current</p>
                            <p className="text-lg font-bold">{area.currentScore}%</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Target</p>
                            <p className="text-lg font-bold text-primary">{area.targetScore}%</p>
                          </div>
                        </div>
                      </div>
                      <Progress value={(area.currentScore / area.targetScore) * 100} className="mt-2" />
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm font-medium mb-2">Action Items:</p>
                      <ul className="space-y-1">
                        {area.actionItems.map((item, itemIndex) => (
                          <li key={itemIndex} className="text-sm flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
