import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  ArrowLeft,
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Clock,
  User,
  Activity,
  TrendingUp,
  Shield,
  Brain,
  Target
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

interface Alert {
  id: number;
  patientId: number;
  patientName: string;
  severity: "critical" | "high" | "medium" | "low";
  type: string;
  title: string;
  description: string;
  suggestedAction: string;
  source: string;
  timestamp: Date;
  acknowledged: boolean;
}

export default function ClinicalAlerts() {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState("all");
  
  // Mock alerts data - in production, this would come from tRPC
  const mockAlerts: Alert[] = [
    {
      id: 1,
      patientId: 1,
      patientName: "John Smith",
      severity: "critical",
      type: "vital_signs",
      title: "Critical Blood Pressure Reading",
      description: "BP 180/110 mmHg detected - 40% above target range. Patient has history of hypertension.",
      suggestedAction: "Immediate physician review required. Consider ER evaluation or urgent medication adjustment per Precision Care protocol.",
      source: "Causal Brain Risk Assessment",
      timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      acknowledged: false,
    },
    {
      id: 2,
      patientId: 2,
      patientName: "Sarah Johnson",
      severity: "high",
      type: "lab_results",
      title: "HbA1c Significantly Elevated",
      description: "HbA1c 9.8% (target <7%). Causal Brain predicts 3.5x increased cardiovascular risk within 12 months.",
      suggestedAction: "Schedule urgent follow-up. Delphi Simulator recommends adding SGLT2 inhibitor + intensifying lifestyle intervention.",
      source: "Semantic Processor + Causal Brain",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      acknowledged: false,
    },
    {
      id: 3,
      patientId: 3,
      patientName: "Michael Chen",
      severity: "high",
      type: "drug_interaction",
      title: "Potential Drug Interaction Detected",
      description: "New prescription for Warfarin conflicts with existing Aspirin regimen. Digital Review Board flagged 2.8x increased bleeding risk.",
      suggestedAction: "Review anticoagulation strategy. Consider alternative therapy or adjust dosing with increased monitoring.",
      source: "Digital Review Board",
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      acknowledged: true,
    },
    {
      id: 4,
      patientId: 1,
      patientName: "John Smith",
      severity: "medium",
      type: "treatment_adherence",
      title: "Medication Adherence Concern",
      description: "Patient missed 4 of last 7 Metformin doses. Causal Brain predicts 45% reduction in treatment efficacy.",
      suggestedAction: "Patient outreach recommended. Precision Care suggests simplified dosing schedule or alternative formulation.",
      source: "Causal Brain Pattern Analysis",
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      acknowledged: false,
    },
    {
      id: 5,
      patientId: 4,
      patientName: "Emily Davis",
      severity: "medium",
      type: "follow_up",
      title: "Overdue Follow-up Appointment",
      description: "Post-procedure follow-up 2 weeks overdue. Causal Brain identifies 28% increased complication risk.",
      suggestedAction: "Contact patient immediately to schedule appointment. Review recent vital signs and symptoms.",
      source: "Marketplace Entry Feedback Loop",
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      acknowledged: false,
    },
    {
      id: 6,
      patientId: 5,
      patientName: "Robert Wilson",
      severity: "low",
      type: "preventive_care",
      title: "Preventive Screening Due",
      description: "Annual diabetic retinopathy screening due within 30 days. Causal Brain recommends early screening based on recent HbA1c trend.",
      suggestedAction: "Schedule ophthalmology referral. Consider expedited appointment given glycemic control concerns.",
      source: "Precision Care Recommendations",
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      acknowledged: true,
    },
  ];

  const [alerts, setAlerts] = useState(mockAlerts);

  const getSeverityIcon = (severity: Alert["severity"]) => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case "high":
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      case "medium":
        return <Info className="h-5 w-5 text-yellow-600" />;
      case "low":
        return <Bell className="h-5 w-5 text-blue-600" />;
    }
  };

  const getSeverityColor = (severity: Alert["severity"]) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "high":
        return "default";
      case "medium":
        return "secondary";
      case "low":
        return "outline";
    }
  };

  const acknowledgeAlert = (alertId: number) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
    toast.success("Alert acknowledged");
  };

  const filteredAlerts = alerts.filter(alert => {
    if (selectedTab === "all") return true;
    if (selectedTab === "unacknowledged") return !alert.acknowledged;
    if (selectedTab === "critical") return alert.severity === "critical" || alert.severity === "high";
    return true;
  });

  const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length;
  const criticalCount = alerts.filter(a => (a.severity === "critical" || a.severity === "high") && !a.acknowledged).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="outline" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Bell className="h-6 w-6" />
                  Clinical Alerts
                </h1>
                <p className="text-sm text-muted-foreground">
                  AI-powered intelligent monitoring and notifications
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-bold">{unacknowledgedCount}</div>
                <div className="text-xs text-muted-foreground">Unacknowledged</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
                <div className="text-xs text-muted-foreground">Critical/High</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container py-8">
        {/* Alert Sources Overview */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Brain className="h-4 w-4 text-cyan-600" />
                Causal Brain
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {alerts.filter(a => a.source.includes("Causal Brain")).length}
              </div>
              <p className="text-xs text-muted-foreground">Risk predictions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4 text-red-600" />
                Review Board
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {alerts.filter(a => a.source.includes("Review Board")).length}
              </div>
              <p className="text-xs text-muted-foreground">Safety alerts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-green-600" />
                Precision Care
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {alerts.filter(a => a.source.includes("Precision Care")).length}
              </div>
              <p className="text-xs text-muted-foreground">Care recommendations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-600" />
                Marketplace
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {alerts.filter(a => a.source.includes("Marketplace")).length}
              </div>
              <p className="text-xs text-muted-foreground">Outcome tracking</p>
            </CardContent>
          </Card>
        </div>

        {/* Alerts List */}
        <Card>
          <CardHeader>
            <CardTitle>Alert Feed</CardTitle>
            <CardDescription>
              Real-time notifications from all framework components
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">
                  All Alerts ({alerts.length})
                </TabsTrigger>
                <TabsTrigger value="unacknowledged">
                  Unacknowledged ({unacknowledgedCount})
                </TabsTrigger>
                <TabsTrigger value="critical">
                  Critical/High ({criticalCount})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={selectedTab} className="space-y-4 mt-4">
                {filteredAlerts.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Alerts</h3>
                    <p className="text-sm text-muted-foreground">
                      All alerts in this category have been addressed
                    </p>
                  </div>
                ) : (
                  filteredAlerts.map((alert) => (
                    <Card 
                      key={alert.id}
                      className={`${
                        !alert.acknowledged && alert.severity === "critical" 
                          ? "border-2 border-red-500" 
                          : !alert.acknowledged && alert.severity === "high"
                          ? "border-2 border-orange-500"
                          : ""
                      }`}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            {getSeverityIcon(alert.severity)}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <CardTitle className="text-base">{alert.title}</CardTitle>
                                <Badge variant={getSeverityColor(alert.severity)}>
                                  {alert.severity.toUpperCase()}
                                </Badge>
                                {alert.acknowledged && (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Acknowledged
                                  </Badge>
                                )}
                              </div>
                              <CardDescription className="flex items-center gap-4 text-xs">
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {alert.patientName}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(alert.timestamp, "MMM d, yyyy 'at' h:mm a")}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Activity className="h-3 w-3" />
                                  {alert.source}
                                </span>
                              </CardDescription>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-sm font-medium mb-1">Alert Details:</p>
                          <p className="text-sm text-muted-foreground">{alert.description}</p>
                        </div>
                        
                        <Separator />
                        
                        <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                          <p className="text-sm font-medium mb-1 flex items-center gap-2">
                            <Target className="h-4 w-4 text-blue-600" />
                            Suggested Action:
                          </p>
                          <p className="text-sm text-muted-foreground">{alert.suggestedAction}</p>
                        </div>

                        <div className="flex gap-2">
                          <Link href={`/patients/${alert.patientId}`}>
                            <Button variant="default" size="sm">
                              <User className="h-3 w-3 mr-2" />
                              View Patient
                            </Button>
                          </Link>
                          {!alert.acknowledged && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => acknowledgeAlert(alert.id)}
                            >
                              <CheckCircle2 className="h-3 w-3 mr-2" />
                              Acknowledge
                            </Button>
                          )}
                          <Button variant="outline" size="sm">
                            <Activity className="h-3 w-3 mr-2" />
                            Take Action
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
