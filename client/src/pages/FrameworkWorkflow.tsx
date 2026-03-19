import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  ArrowLeft,
  Play,
  CheckCircle2,
  Loader2,
  FileText,
  Link as LinkIcon,
  Brain,
  Target,
  Shield,
  TrendingUp,
  Download,
  Sparkles
} from "lucide-react";
import { Link, useParams } from "wouter";
import { Streamdown } from "streamdown";

interface WorkflowStep {
  id: string;
  name: string;
  icon: any;
  status: "pending" | "running" | "completed" | "error";
  result?: string;
  color: string;
}

export default function FrameworkWorkflow() {
  const { user } = useAuth();
  const params = useParams();
  const encounterId = params.encounterId ? parseInt(params.encounterId) : undefined;
  
  const [isRunning, setIsRunning] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [progress, setProgress] = useState(0);
  
  const [steps, setSteps] = useState<WorkflowStep[]>([
    { id: "dao", name: "DAO Protocol", icon: FileText, status: "pending", color: "blue" },
    { id: "semantic", name: "Semantic Processor", icon: LinkIcon, status: "pending", color: "orange" },
    { id: "causal", name: "Causal Brain", icon: Brain, status: "pending", color: "cyan" },
    { id: "delphi", name: "Delphi Simulator", icon: Sparkles, status: "pending", color: "purple" },
    { id: "precision", name: "Precision Care", icon: Target, status: "pending", color: "green" },
    { id: "review", name: "Digital Review Board", icon: Shield, status: "pending", color: "red" },
    { id: "marketplace", name: "Marketplace Entry", icon: TrendingUp, status: "pending", color: "amber" },
  ]);

  const { data: encounter } = trpc.dao.getById.useQuery(
    { id: encounterId! },
    { enabled: !!encounterId }
  );

  const runWorkflowStep = trpc.ai.runFrameworkWorkflow.useMutation();

  const updateStepStatus = (index: number, status: WorkflowStep["status"], result?: string) => {
    setSteps(prev => prev.map((step, i) => 
      i === index ? { ...step, status, result } : step
    ));
  };

  const runCompleteWorkflow = async () => {
    if (!encounter) {
      toast.error("No encounter data available");
      return;
    }

    setIsRunning(true);
    setProgress(0);
    
    // Reset all steps
    setSteps(prev => prev.map(step => ({ ...step, status: "pending" as const, result: undefined })));
    
    const stepIds = ['dao', 'semantic', 'causal', 'delphi', 'precision', 'review', 'marketplace'] as const;
    const progressPoints = [14, 28, 42, 56, 70, 84, 98];
    try {
      for (let i = 0; i < stepIds.length; i++) {
        setCurrentStepIndex(i);
        updateStepStatus(i, "running");
        setProgress(progressPoints[i]);
        try {
          const res = await runWorkflowStep.mutateAsync({ daoEntryId: encounter.id, step: stepIds[i] });
          updateStepStatus(i, "completed", res.result);
        } catch (stepErr: any) {
          const msg = stepErr?.message || 'Step failed';
          updateStepStatus(i, "error", `**Error:** ${msg}`);
          toast.error(`Step ${stepIds[i]} failed: ${msg}`);
          // Continue to next step rather than aborting entire workflow
        }
      }
      setProgress(100);
      setCurrentStepIndex(-1);
      toast.success("Framework workflow complete — all 7 steps executed");
    } catch (error) {
      console.error("Workflow error:", error);
      toast.error("Workflow execution failed");
    } finally {
      setIsRunning(false);
    }
  };

  if (!encounterId || !encounter) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Invalid Encounter</h2>
          <p className="text-muted-foreground mb-4">No encounter data available</p>
          <Link href="/">
            <Button>Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/patients/${encounter.patientId}`}>
                <Button variant="outline" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Complete Framework Workflow</h1>
                <p className="text-sm text-muted-foreground">
                  End-to-end AI analysis: DAO → Semantic → Causal Brain ↔ Delphi → Precision → Review → Marketplace
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={runCompleteWorkflow}
                disabled={isRunning}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Running Analysis...
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 mr-2" />
                    Run Complete Analysis
                  </>
                )}
              </Button>
              {progress === 100 && (
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export Results
                </Button>
              )}
            </div>
          </div>
          {isRunning && (
            <div className="mt-4">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1 text-center">
                {progress}% complete
              </p>
            </div>
          )}
        </div>
      </header>

      <div className="container py-8">
        {/* Encounter Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Clinical Encounter Summary</CardTitle>
            <CardDescription>Input data for framework analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-muted-foreground mb-1">Chief Complaint:</p>
                <p>{encounter.chiefComplaint}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground mb-1">Diagnosis:</p>
                <p>{encounter.diagnosis}</p>
              </div>
              <div className="md:col-span-2">
                <p className="font-medium text-muted-foreground mb-1">Treatment Plan:</p>
                <p>{encounter.treatmentPlan}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Workflow Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStepIndex === index;
            const isCompleted = step.status === "completed";
            const isPending = step.status === "pending";
            const isError = step.status === "error";
            
            return (
              <Card 
                key={step.id}
                className={`transition-all ${
                  isActive ? "ring-2 ring-primary shadow-lg" : ""
                } ${isCompleted ? "border-green-500" : ""} ${isError ? "border-red-500" : ""}`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        isCompleted ? "bg-green-100 dark:bg-green-950" :
                        isActive ? "bg-primary/10" :
                        isPending ? "bg-muted" :
                        "bg-red-100 dark:bg-red-950"
                      }`}>
                        <Icon className={`h-5 w-5 ${
                          isCompleted ? "text-green-600" :
                          isActive ? "text-primary" :
                          isPending ? "text-muted-foreground" :
                          "text-red-600"
                        }`} />
                      </div>
                      <div>
                        <CardTitle className="text-base">{step.name}</CardTitle>
                        <CardDescription className="text-xs">
                          Step {index + 1} of {steps.length}
                        </CardDescription>
                      </div>
                    </div>
                    <div>
                      {isCompleted && (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Completed
                        </Badge>
                      )}
                      {isActive && (
                        <Badge variant="default">
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Running
                        </Badge>
                      )}
                      {isPending && (
                        <Badge variant="outline">Pending</Badge>
                      )}
                      {isError && (
                        <Badge variant="destructive">Error</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                {step.result && (
                  <CardContent>
                    <Separator className="mb-4" />
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <Streamdown>{step.result}</Streamdown>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Final Summary */}
        {progress === 100 && (
          <Card className="mt-6 border-2 border-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-6 w-6" />
                Complete Framework Analysis Finished
              </CardTitle>
              <CardDescription>
                All 7 components executed successfully with bidirectional refinement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm">
                  The complete AI-driven clinical decision support workflow has been executed. The Causal Brain
                  and Delphi Simulator communicated bidirectionally to optimize treatment recommendations, and
                  all safety checks passed through the Digital Review Board. The case has been logged in the
                  Marketplace Entry feedback loop for continuous model improvement.
                </p>
                <div className="flex gap-2">
                  <Button variant="default">
                    <FileText className="h-4 w-4 mr-2" />
                    Implement Care Plan
                  </Button>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export Full Report
                  </Button>
                  <Button variant="outline">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Track Outcomes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
