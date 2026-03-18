import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { 
  User,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Activity,
  FileText,
  AlertCircle,
  Pill,
  Heart,
  TrendingUp,
  Clock,
  Loader2,
  ArrowLeft,
  Brain,
  Sparkles,
  CheckCircle2,
  XCircle,
  Edit3,
  ShieldAlert,
  AlertTriangle,
  Info
} from "lucide-react";
import { Link, useParams } from "wouter";
import { format } from "date-fns";

export default function PatientDetail() {
  const { user } = useAuth();
  const params = useParams();
  const patientId = params.id ? parseInt(params.id) : undefined;
  const { toast } = useToast();

  // Recommendation action state
  const [feedbackDialog, setFeedbackDialog] = useState<{
    open: boolean;
    rec: any;
    action: 'accepted' | 'rejected' | 'modified';
  }>({ open: false, rec: null, action: 'accepted' });
  const [feedbackText, setFeedbackText] = useState('');

  const { data: patient, isLoading: patientLoading } = trpc.patients.getWithHistory.useQuery(
    { patientId: patientId! },
    { enabled: !!patientId }
  );

  const { data: encounters, isLoading: encountersLoading } = trpc.patients.getEncounters.useQuery(
    { patientId: patientId! },
    { enabled: !!patientId }
  );

  const { data: vitalSigns, isLoading: vitalsLoading } = trpc.patients.getVitalSignsHistory.useQuery(
    { patientId: patientId!, limit: 10 },
    { enabled: !!patientId }
  );

  const { data: diagnosisHistory, isLoading: diagnosisLoading } = trpc.patients.getDiagnosisHistory.useQuery(
    { patientId: patientId! },
    { enabled: !!patientId }
  );

  const { data: recommendations, isLoading: recsLoading, refetch: refetchRecs } =
    trpc.causalBrain.getRecommendationsByPatient.useQuery(
      { patientId: patientId! },
      { enabled: !!patientId }
    );

  const { data: riskPredictions, isLoading: riskLoading } =
    trpc.riskPredictions.getPatientPredictions.useQuery(
      { patientId: patientId! },
      { enabled: !!patientId }
    );

  const updateStatus = trpc.causalBrain.updateRecommendationStatus.useMutation({
    onSuccess: () => {
      toast({ title: 'Recommendation updated', description: 'Status saved and policy priors updated.' });
      setFeedbackDialog({ open: false, rec: null, action: 'accepted' });
      setFeedbackText('');
      refetchRecs();
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const openFeedback = (rec: any, action: 'accepted' | 'rejected' | 'modified') => {
    setFeedbackText('');
    setFeedbackDialog({ open: true, rec, action });
  };

  const submitFeedback = () => {
    if (!feedbackDialog.rec) return;
    updateStatus.mutate({
      recommendationId: feedbackDialog.rec.id,
      status: feedbackDialog.action,
      feedback: feedbackText || undefined,
    });
  };

  if (!patientId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Patient Not Found</h2>
          <p className="text-muted-foreground mb-4">Invalid patient ID</p>
          <Link href="/"><Button>Return to Dashboard</Button></Link>
        </div>
      </div>
    );
  }

  if (patientLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Patient Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested patient could not be found</p>
          <Link href="/"><Button>Return to Dashboard</Button></Link>
        </div>
      </div>
    );
  }

  const age = Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));

  const getRiskBadgeClass = (level: string) => {
    switch (level) {
      case 'very_high': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'moderate': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-600 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted': return <Badge className="bg-green-100 text-green-800 border-green-300">Accepted</Badge>;
      case 'rejected': return <Badge className="bg-red-100 text-red-800 border-red-300">Rejected</Badge>;
      case 'modified': return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Modified</Badge>;
      default: return <Badge variant="outline" className="text-muted-foreground">Pending</Badge>;
    }
  };

  const pendingRecs = recommendations?.filter((r: any) => r.status === 'pending') ?? [];
  const decidedRecs = recommendations?.filter((r: any) => r.status !== 'pending') ?? [];
  const highRiskPredictions = riskPredictions?.filter((p: any) => p.riskLevel === 'high' || p.riskLevel === 'very_high') ?? [];

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
                <h1 className="text-3xl font-bold text-foreground">
                  {patient.firstName} {patient.lastName}
                </h1>
                <p className="text-muted-foreground mt-1">
                  MRN: {patient.mrn} • {age} years old • {patient.gender}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {highRiskPredictions.length > 0 && (
                <Badge className="bg-red-600 text-white gap-1">
                  <ShieldAlert className="h-3 w-3" />
                  {highRiskPredictions.length} High Risk
                </Badge>
              )}
              {pendingRecs.length > 0 && (
                <Badge variant="outline" className="gap-1 border-orange-400 text-orange-600">
                  <Clock className="h-3 w-3" />
                  {pendingRecs.length} Pending Recs
                </Badge>
              )}
              <Badge variant={patient.status === "active" ? "default" : "secondary"}>
                {patient.status}
              </Badge>
              <Link href={`/patients/${patientId}/encounters/new`}>
                <Button variant="default">
                  <Sparkles className="h-4 w-4 mr-2" />
                  New Encounter
                </Button>
              </Link>
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Export Records
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column: Patient Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Demographics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Demographics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Date of Birth</p>
                    <p className="text-muted-foreground">{format(new Date(patient.dateOfBirth), "MMM d, yyyy")}</p>
                  </div>
                </div>
                {patient.email && (
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-muted-foreground">{patient.email}</p>
                    </div>
                  </div>
                )}
                {patient.phone && (
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Phone</p>
                      <p className="text-muted-foreground">{patient.phone}</p>
                    </div>
                  </div>
                )}
                {patient.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Address</p>
                      <p className="text-muted-foreground">{patient.address}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Allergies */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  Allergies & Adverse Reactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patient.allergies && patient.allergies.length > 0 ? (
                  <div className="space-y-2">
                    {patient.allergies.map((allergy: string, index: number) => (
                      <div key={index} className="p-2 bg-destructive/10 border border-destructive/20 rounded-md">
                        <p className="text-sm font-medium text-destructive">{allergy}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No known allergies</p>
                )}
              </CardContent>
            </Card>

            {/* Current Medications */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Pill className="h-4 w-4" />
                  Current Medications
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patient.currentMedications && patient.currentMedications.length > 0 ? (
                  <ul className="space-y-2">
                    {patient.currentMedications.map((med: string, index: number) => (
                      <li key={index} className="text-sm p-2 bg-muted rounded-md">{med}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No current medications</p>
                )}
              </CardContent>
            </Card>

            {/* Chronic Conditions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Chronic Conditions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patient.chronicConditions && patient.chronicConditions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {patient.chronicConditions.map((condition: string, index: number) => (
                      <Badge key={index} variant="outline">{condition}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No chronic conditions documented</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Clinical Data */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="encounters" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="encounters">
                  <FileText className="h-4 w-4 mr-1" />
                  Encounters
                </TabsTrigger>
                <TabsTrigger value="vitals">
                  <Activity className="h-4 w-4 mr-1" />
                  Vitals
                </TabsTrigger>
                <TabsTrigger value="diagnoses">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Diagnoses
                </TabsTrigger>
                <TabsTrigger value="recommendations" className="relative">
                  <Brain className="h-4 w-4 mr-1" />
                  Recs
                  {pendingRecs.length > 0 && (
                    <span className="ml-1 bg-orange-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                      {pendingRecs.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="risk">
                  <ShieldAlert className="h-4 w-4 mr-1" />
                  Risk
                  {highRiskPredictions.length > 0 && (
                    <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                      {highRiskPredictions.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Encounters Tab */}
              <TabsContent value="encounters" className="space-y-4">
                {encountersLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : encounters && encounters.length > 0 ? (
                  <div className="space-y-4">
                    {encounters.map((encounter: any) => (
                      <Card key={encounter.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-base">{encounter.chiefComplaint}</CardTitle>
                              <CardDescription className="flex items-center gap-2 mt-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(encounter.createdAt), "MMM d, yyyy 'at' h:mm a")}
                              </CardDescription>
                            </div>
                            <Badge variant={encounter.status === "completed" ? "default" : "secondary"}>
                              {encounter.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {encounter.diagnosis && (
                            <div className="mb-3">
                              <p className="text-xs text-muted-foreground mb-1">Diagnosis</p>
                              <p className="text-sm font-medium">{encounter.diagnosis}</p>
                            </div>
                          )}
                          {encounter.treatmentPlan && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Treatment Plan</p>
                              <p className="text-sm">{encounter.treatmentPlan}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Encounters Yet</h3>
                      <p className="text-sm text-muted-foreground mb-4">Start a new encounter to begin clinical documentation.</p>
                      <Link href={`/patients/${patientId}/encounters/new`}>
                        <Button><Sparkles className="h-4 w-4 mr-2" />New Encounter</Button>
                      </Link>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Vitals Tab */}
              <TabsContent value="vitals" className="space-y-4">
                {vitalsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : vitalSigns && vitalSigns.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Vital Signs History</CardTitle>
                      <CardDescription>Last {vitalSigns.length} recorded measurements</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {vitalSigns.map((vital: any) => (
                          <div key={vital.id} className="p-4 border rounded-lg">
                            <p className="text-xs text-muted-foreground mb-3">
                              {format(new Date(vital.recordedAt), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                            <div className="grid grid-cols-3 gap-3 text-sm">
                              {vital.bloodPressureSystolic && (
                                <div>
                                  <p className="text-xs text-muted-foreground">BP</p>
                                  <p className="font-semibold">{vital.bloodPressureSystolic}/{vital.bloodPressureDiastolic} mmHg</p>
                                </div>
                              )}
                              {vital.heartRate && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Heart Rate</p>
                                  <p className="font-semibold">{vital.heartRate} bpm</p>
                                </div>
                              )}
                              {vital.temperature && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Temp</p>
                                  <p className="font-semibold">{vital.temperature}°F</p>
                                </div>
                              )}
                              {vital.oxygenSaturation && (
                                <div>
                                  <p className="text-xs text-muted-foreground">SpO2</p>
                                  <p className="font-semibold">{vital.oxygenSaturation}%</p>
                                </div>
                              )}
                              {vital.weight && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Weight</p>
                                  <p className="font-semibold">{vital.weight} kg</p>
                                </div>
                              )}
                              {vital.bmi && (
                                <div>
                                  <p className="text-xs text-muted-foreground">BMI</p>
                                  <p className="font-semibold">{Number(vital.bmi).toFixed(1)}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <Activity className="h-16 w-16 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Vital Signs Recorded</h3>
                      <p className="text-sm text-muted-foreground">Vital signs will appear here after encounters.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Diagnoses Tab */}
              <TabsContent value="diagnoses" className="space-y-4">
                {diagnosisLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : diagnosisHistory && diagnosisHistory.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Diagnosis History</CardTitle>
                      <CardDescription>Chronological record of all diagnoses</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {diagnosisHistory.map((record: any) => (
                          <div key={record.id} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-medium">
                                {format(new Date(record.createdAt), "MMM d, yyyy")}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Primary Diagnosis</p>
                                <p className="text-sm">{record.diagnosis}</p>
                              </div>
                              {record.differentialDiagnosis && record.differentialDiagnosis.length > 0 && (
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Differential Diagnoses</p>
                                  <div className="flex flex-wrap gap-1">
                                    {record.differentialDiagnosis.map((diff: string, index: number) => (
                                      <Badge key={index} variant="outline" className="text-xs">{diff}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <TrendingUp className="h-16 w-16 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Diagnoses Recorded</h3>
                      <p className="text-sm text-muted-foreground">No diagnoses have been documented for this patient yet.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Recommendations Tab */}
              <TabsContent value="recommendations" className="space-y-4">
                {recsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : recommendations && recommendations.length > 0 ? (
                  <div className="space-y-6">
                    {/* Pending section */}
                    {pendingRecs.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-orange-600 mb-3 flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Awaiting Decision ({pendingRecs.length})
                        </h3>
                        <div className="space-y-3">
                          {pendingRecs.map((rec: any) => (
                            <Card key={rec.id} className="border-orange-200">
                              <CardContent className="pt-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="font-semibold text-sm truncate">{rec.treatmentName}</p>
                                      {rec.confidenceScore && (
                                        <Badge variant="outline" className="text-xs shrink-0">
                                          {(Number(rec.confidenceScore) * 100).toFixed(0)}% confidence
                                        </Badge>
                                      )}
                                    </div>
                                    {rec.diagnosisCode && (
                                      <p className="text-xs text-muted-foreground mb-2">Dx: {rec.diagnosisCode}</p>
                                    )}
                                    {rec.rationale && (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <p className="text-sm text-muted-foreground line-clamp-2 cursor-help">
                                              {rec.rationale}
                                            </p>
                                          </TooltipTrigger>
                                          <TooltipContent side="bottom" className="max-w-sm">
                                            <p className="text-xs">{rec.rationale}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                    {rec.evidenceLevel && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Evidence: Grade {rec.evidenceLevel}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex gap-2 shrink-0">
                                    <Button
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                      onClick={() => openFeedback(rec, 'accepted')}
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                      Accept
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-blue-400 text-blue-600 hover:bg-blue-50"
                                      onClick={() => openFeedback(rec, 'modified')}
                                    >
                                      <Edit3 className="h-3.5 w-3.5 mr-1" />
                                      Modify
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-red-400 text-red-600 hover:bg-red-50"
                                      onClick={() => openFeedback(rec, 'rejected')}
                                    >
                                      <XCircle className="h-3.5 w-3.5 mr-1" />
                                      Reject
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Decided section */}
                    {decidedRecs.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                          Decided ({decidedRecs.length})
                        </h3>
                        <div className="space-y-2">
                          {decidedRecs.map((rec: any) => (
                            <Card key={rec.id} className="opacity-80">
                              <CardContent className="pt-4 pb-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="font-medium text-sm truncate">{rec.treatmentName}</p>
                                      {getStatusBadge(rec.status)}
                                    </div>
                                    {rec.physicianFeedback && (
                                      <p className="text-xs text-muted-foreground italic">"{rec.physicianFeedback}"</p>
                                    )}
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-xs text-muted-foreground shrink-0"
                                    onClick={() => openFeedback(rec, 'accepted')}
                                  >
                                    Revise
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <Brain className="h-16 w-16 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Recommendations Yet</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Causal Brain recommendations appear here after running an encounter with causal analysis.
                      </p>
                      <Link href={`/patients/${patientId}/encounters/new`}>
                        <Button variant="outline"><Sparkles className="h-4 w-4 mr-2" />Start Encounter</Button>
                      </Link>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Risk Predictions Tab */}
              <TabsContent value="risk" className="space-y-4">
                {riskLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : riskPredictions && riskPredictions.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Info className="h-3.5 w-3.5" />
                      Delphi-2M disease risk predictions — auto-generated on diagnosis entry
                    </div>
                    {riskPredictions
                      .slice()
                      .sort((a: any, b: any) => {
                        const order: Record<string, number> = { very_high: 0, high: 1, moderate: 2, low: 3 };
                        return (order[a.riskLevel] ?? 4) - (order[b.riskLevel] ?? 4);
                      })
                      .map((pred: any) => (
                        <Card key={pred.id}>
                          <CardContent className="pt-4">
                            <div className="flex items-start gap-4">
                              {/* Risk level indicator */}
                              <div className="shrink-0 text-center">
                                <div className={`rounded-lg px-3 py-2 text-center ${getRiskBadgeClass(pred.riskLevel)}`}>
                                  <p className="text-lg font-bold leading-none">
                                    {(Number(pred.riskProbability) * 100).toFixed(0)}%
                                  </p>
                                  <p className="text-xs mt-0.5 opacity-90">
                                    {pred.riskLevel.replace('_', ' ')}
                                  </p>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{pred.timeHorizon}yr horizon</p>
                              </div>

                              {/* Disease info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-semibold text-sm">{pred.diseaseName}</p>
                                  <Badge variant="outline" className="text-xs shrink-0">{pred.diseaseCode}</Badge>
                                  {pred.diseaseCategory && (
                                    <Badge variant="secondary" className="text-xs shrink-0">{pred.diseaseCategory}</Badge>
                                  )}
                                </div>

                                {/* Rationale tooltip */}
                                {pred.clinicalNotes && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <p className="text-sm text-muted-foreground line-clamp-2 cursor-help flex items-start gap-1">
                                          <Info className="h-3 w-3 mt-0.5 shrink-0 text-blue-400" />
                                          {pred.clinicalNotes}
                                        </p>
                                      </TooltipTrigger>
                                      <TooltipContent side="bottom" className="max-w-sm">
                                        <p className="text-xs font-medium mb-1">Clinical Rationale</p>
                                        <p className="text-xs">{pred.clinicalNotes}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}

                                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                  {pred.confidenceScore && (
                                    <span>Confidence: {(Number(pred.confidenceScore) * 100).toFixed(0)}%</span>
                                  )}
                                  <span>•</span>
                                  <span>
                                    {pred.actionTaken === 'pending' ? (
                                      <span className="text-orange-500 flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" /> Awaiting action
                                      </span>
                                    ) : (
                                      <span className="text-green-600 flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" /> {pred.actionTaken}
                                      </span>
                                    )}
                                  </span>
                                  {pred.predictionDate && (
                                    <>
                                      <span>•</span>
                                      <span>{format(new Date(pred.predictionDate), "MMM d, yyyy")}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <ShieldAlert className="h-16 w-16 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Risk Predictions Yet</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Delphi-2M predictions are auto-generated when a diagnosis is added during an encounter.
                      </p>
                      <Link href={`/patients/${patientId}/encounters/new`}>
                        <Button variant="outline"><Sparkles className="h-4 w-4 mr-2" />Start Encounter</Button>
                      </Link>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Recommendation Feedback Dialog */}
      <Dialog open={feedbackDialog.open} onOpenChange={(open) => !open && setFeedbackDialog(d => ({ ...d, open: false }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {feedbackDialog.action === 'accepted' && 'Accept Recommendation'}
              {feedbackDialog.action === 'rejected' && 'Reject Recommendation'}
              {feedbackDialog.action === 'modified' && 'Modify Recommendation'}
            </DialogTitle>
            <DialogDescription>
              {feedbackDialog.rec?.treatmentName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {feedbackDialog.rec?.rationale && (
              <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">AI Rationale</p>
                {feedbackDialog.rec.rationale}
              </div>
            )}
            <div>
              <Label htmlFor="feedback-text">
                {feedbackDialog.action === 'accepted' && 'Clinical notes (optional)'}
                {feedbackDialog.action === 'rejected' && 'Reason for rejection'}
                {feedbackDialog.action === 'modified' && 'Describe modifications'}
              </Label>
              <Textarea
                id="feedback-text"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder={
                  feedbackDialog.action === 'accepted' ? 'Any additional clinical notes...' :
                  feedbackDialog.action === 'rejected' ? 'Why is this recommendation not suitable?' :
                  'What modifications are needed?'
                }
                rows={4}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackDialog(d => ({ ...d, open: false }))}>
              Cancel
            </Button>
            <Button
              onClick={submitFeedback}
              disabled={updateStatus.isPending}
              className={
                feedbackDialog.action === 'accepted' ? 'bg-green-600 hover:bg-green-700' :
                feedbackDialog.action === 'rejected' ? 'bg-red-600 hover:bg-red-700' :
                'bg-blue-600 hover:bg-blue-700'
              }
            >
              {updateStatus.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
              ) : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
