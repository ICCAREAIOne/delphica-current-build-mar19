import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowRight, AlertTriangle, TrendingUp, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function RiskPredictions() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedPatient, setSelectedPatient] = useState<number | null>(null);
  const [selectedPrediction, setSelectedPrediction] = useState<any>(null);
  const [showExploreDialog, setShowExploreDialog] = useState(false);
  
  // Get patients
  const { data: patients } = trpc.patients.list.useQuery({});
  
  // Get predictions for selected patient
  const { data: predictions, refetch: refetchPredictions } = trpc.riskPredictions.getPatientPredictions.useQuery(
    { patientId: selectedPatient! },
    { enabled: !!selectedPatient }
  );
  
  // Get pending predictions
  const { data: pendingPredictions } = trpc.riskPredictions.getPendingPredictions.useQuery();
  
  // Get stats
  const { data: stats } = trpc.riskPredictions.getStats.useQuery();
  
  // Explore risk prediction mutation
  const exploreRisk = trpc.riskPredictions.exploreRiskPrediction.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Scenarios Generated",
        description: `Created ${data.scenarioCount} preventive treatment scenarios. Opening Delphi Simulator...`,
      });
      refetchPredictions();
      setShowExploreDialog(false);
      // Navigate to clinical sessions to access Delphi Simulator
      setLocation("/clinical-sessions");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update action mutation
  const updateAction = trpc.riskPredictions.updateAction.useMutation({
    onSuccess: () => {
      toast({
        title: "Status Updated",
        description: "Risk prediction status has been updated.",
      });
      refetchPredictions();
    },
  });
  
  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case "very_high":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "moderate":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };
  
  const getRiskLevelLabel = (level: string) => {
    return level.replace("_", " ").toUpperCase();
  };
  
  const getActionIcon = (action: string) => {
    switch (action) {
      case "explored":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "monitored":
        return <Clock className="h-4 w-4 text-blue-600" />;
      case "dismissed":
        return <XCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
    }
  };
  
  const handleExploreClick = async (prediction: any) => {
    setSelectedPrediction(prediction);
    setShowExploreDialog(true);
  };
  
  const confirmExplore = async () => {
    if (!selectedPrediction) return;
    
    // Create a temporary clinical session for this exploration
    // In a real implementation, you'd either use an existing session or create a proper one
    const sessionId = 1; // Placeholder - should be created dynamically
    
    await exploreRisk.mutateAsync({
      predictionId: selectedPrediction.id,
      sessionId,
    });
  };
  
  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Disease Risk Predictions</h1>
        <p className="text-muted-foreground">
          Delphi-2M Integration: Prediction → Exploration → Decision → Action
        </p>
      </div>
      
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Predictions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPredictions}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.highRiskCount}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Explored</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.exploredCount}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pendingCount}</div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Patient Selection */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Select Patient</CardTitle>
          <CardDescription>View risk predictions for a specific patient</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedPatient?.toString()}
            onValueChange={(value) => setSelectedPatient(Number(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a patient..." />
            </SelectTrigger>
            <SelectContent>
              {patients?.map((patient: any) => (
                <SelectItem key={patient.id} value={patient.id.toString()}>
                  {patient.firstName} {patient.lastName} (MRN: {patient.mrn})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      
      {/* Predictions Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Predictions</TabsTrigger>
          <TabsTrigger value="pending">Pending Review</TabsTrigger>
          <TabsTrigger value="high-risk">High Risk</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          {!selectedPatient ? (
            <Alert>
              <AlertDescription>
                Please select a patient to view their risk predictions.
              </AlertDescription>
            </Alert>
          ) : predictions && predictions.length > 0 ? (
            <div className="grid gap-4">
              {predictions.map((prediction: any) => (
                <Card key={prediction.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg">{prediction.diseaseName}</CardTitle>
                          <Badge className={getRiskLevelColor(prediction.riskLevel)}>
                            {getRiskLevelLabel(prediction.riskLevel)}
                          </Badge>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            {getActionIcon(prediction.actionTaken)}
                            <span className="capitalize">{prediction.actionTaken}</span>
                          </div>
                        </div>
                        <CardDescription>
                          {prediction.diseaseCode} • {prediction.diseaseCategory}
                        </CardDescription>
                      </div>
                      
                      {prediction.actionTaken === "pending" && (
                        <Button
                          onClick={() => handleExploreClick(prediction)}
                          className="flex items-center gap-2"
                        >
                          Explore Treatment
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground mb-1">Risk Probability</div>
                        <div className="font-semibold text-lg">
                          {(Number(prediction.riskProbability) * 100).toFixed(1)}%
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-muted-foreground mb-1">Time Horizon</div>
                        <div className="font-semibold text-lg">
                          {prediction.timeHorizon} years
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-muted-foreground mb-1">Confidence</div>
                        <div className="font-semibold text-lg">
                          {prediction.confidenceScore
                            ? `${(Number(prediction.confidenceScore) * 100).toFixed(0)}%`
                            : "N/A"}
                        </div>
                      </div>
                    </div>
                    
                    {prediction.scenarioGenerated && (
                      <Alert className="mt-4">
                        <TrendingUp className="h-4 w-4" />
                        <AlertDescription>
                          Preventive treatment scenarios have been generated. View in Delphi Simulator.
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {prediction.clinicalNotes && (
                      <div className="mt-4 p-3 bg-muted rounded-md">
                        <div className="text-sm font-medium mb-1">Clinical Notes</div>
                        <div className="text-sm text-muted-foreground">{prediction.clinicalNotes}</div>
                      </div>
                    )}
                    
                    {prediction.actionTaken !== "pending" && (
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            updateAction.mutate({
                              predictionId: prediction.id,
                              actionTaken: "pending",
                            })
                          }
                        >
                          Reset to Pending
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                No risk predictions found for this patient.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
        
        <TabsContent value="pending" className="space-y-4">
          {pendingPredictions && pendingPredictions.length > 0 ? (
            <div className="grid gap-4">
              {pendingPredictions.map((prediction: any) => (
                <Card key={prediction.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg">{prediction.diseaseName}</CardTitle>
                          <Badge className={getRiskLevelColor(prediction.riskLevel)}>
                            {getRiskLevelLabel(prediction.riskLevel)}
                          </Badge>
                        </div>
                        <CardDescription>
                          Patient ID: {prediction.patientId} • {prediction.diseaseCode}
                        </CardDescription>
                      </div>
                      
                      <Button
                        onClick={() => handleExploreClick(prediction)}
                        className="flex items-center gap-2"
                      >
                        Explore Treatment
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground mb-1">Risk Probability</div>
                        <div className="font-semibold text-lg">
                          {(Number(prediction.riskProbability) * 100).toFixed(1)}%
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-muted-foreground mb-1">Time Horizon</div>
                        <div className="font-semibold text-lg">
                          {prediction.timeHorizon} years
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-muted-foreground mb-1">Prediction Date</div>
                        <div className="font-semibold">
                          {new Date(prediction.predictionDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                No pending risk predictions require review.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
        
        <TabsContent value="high-risk" className="space-y-4">
          {selectedPatient ? (
            predictions && predictions.filter((p: any) => p.riskLevel === "high" || p.riskLevel === "very_high").length > 0 ? (
              <div className="grid gap-4">
                {predictions
                  .filter((p: any) => p.riskLevel === "high" || p.riskLevel === "very_high")
                  .map((prediction: any) => (
                    <Card key={prediction.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <CardTitle className="text-lg">{prediction.diseaseName}</CardTitle>
                              <Badge className={getRiskLevelColor(prediction.riskLevel)}>
                                {getRiskLevelLabel(prediction.riskLevel)}
                              </Badge>
                            </div>
                            <CardDescription>
                              {prediction.diseaseCode} • {prediction.diseaseCategory}
                            </CardDescription>
                          </div>
                          
                          {prediction.actionTaken === "pending" && (
                            <Button
                              onClick={() => handleExploreClick(prediction)}
                              className="flex items-center gap-2"
                            >
                              Explore Treatment
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground mb-1">Risk Probability</div>
                            <div className="font-semibold text-lg text-red-600">
                              {(Number(prediction.riskProbability) * 100).toFixed(1)}%
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-muted-foreground mb-1">Time Horizon</div>
                            <div className="font-semibold text-lg">
                              {prediction.timeHorizon} years
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-muted-foreground mb-1">Status</div>
                            <div className="flex items-center gap-1">
                              {getActionIcon(prediction.actionTaken)}
                              <span className="capitalize font-semibold">{prediction.actionTaken}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            ) : (
              <Alert>
                <AlertDescription>
                  No high-risk predictions found for this patient.
                </AlertDescription>
              </Alert>
            )
          ) : (
            <Alert>
              <AlertDescription>
                Please select a patient to view high-risk predictions.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Explore Dialog */}
      <Dialog open={showExploreDialog} onOpenChange={setShowExploreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Explore Preventive Treatment Options</DialogTitle>
            <DialogDescription>
              Generate evidence-based preventive treatment scenarios using the Delphi Simulator.
            </DialogDescription>
          </DialogHeader>
          
          {selectedPrediction && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="font-semibold mb-2">{selectedPrediction.diseaseName}</div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>Risk Level: <span className="font-medium">{getRiskLevelLabel(selectedPrediction.riskLevel)}</span></div>
                  <div>Probability: <span className="font-medium">{(Number(selectedPrediction.riskProbability) * 100).toFixed(1)}%</span></div>
                  <div>Time Horizon: <span className="font-medium">{selectedPrediction.timeHorizon} years</span></div>
                </div>
              </div>
              
              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertDescription>
                  The AI will generate 3-5 preventive treatment scenarios based on the patient's medical history and this risk prediction. You can then explore each scenario through conversational role-play with a virtual patient.
                </AlertDescription>
              </Alert>
              
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowExploreDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={confirmExplore}
                  disabled={exploreRisk.isPending}
                  className="flex items-center gap-2"
                >
                  {exploreRisk.isPending ? "Generating..." : "Generate Scenarios"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
