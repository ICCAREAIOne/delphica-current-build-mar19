import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
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
  Sparkles
} from "lucide-react";
import { Link, useParams } from "wouter";
import { format } from "date-fns";

export default function PatientDetail() {
  const { user } = useAuth();
  const params = useParams();
  const patientId = params.id ? parseInt(params.id) : undefined;

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

  if (!patientId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Patient Not Found</h2>
          <p className="text-muted-foreground mb-4">Invalid patient ID</p>
          <Link href="/">
            <Button>Return to Dashboard</Button>
          </Link>
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
          <Link href="/">
            <Button>Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const age = Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));

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
              <Badge variant={patient.status === "active" ? "default" : "secondary"}>
                {patient.status}
              </Badge>
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
                    {patient.allergies.map((allergy, index) => (
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
                    {patient.currentMedications.map((med, index) => (
                      <li key={index} className="text-sm p-2 bg-muted rounded-md">
                        {med}
                      </li>
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
                  <div className="space-y-2">
                    {patient.chronicConditions.map((condition, index) => (
                      <Badge key={index} variant="outline" className="mr-2">
                        {condition}
                      </Badge>
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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="encounters">
                  <FileText className="h-4 w-4 mr-2" />
                  Encounters
                </TabsTrigger>
                <TabsTrigger value="vitals">
                  <Activity className="h-4 w-4 mr-2" />
                  Vital Signs
                </TabsTrigger>
                <TabsTrigger value="diagnoses">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Diagnoses
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
                    {encounters.map((encounter) => (
                      <Card key={encounter.id} className="hover:shadow-md transition-shadow">
                        <CardHeader>
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
                        <CardContent className="space-y-4">
                          {/* Vital Signs */}
                          {encounter.vitalSigns && (
                            <div>
                              <p className="text-sm font-medium mb-2">Vital Signs</p>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                {encounter.vitalSigns.temperature && (
                                  <div className="flex justify-between p-2 bg-muted rounded">
                                    <span className="text-muted-foreground">Temp:</span>
                                    <span className="font-medium">{encounter.vitalSigns.temperature}°F</span>
                                  </div>
                                )}
                                {encounter.vitalSigns.bloodPressure && (
                                  <div className="flex justify-between p-2 bg-muted rounded">
                                    <span className="text-muted-foreground">BP:</span>
                                    <span className="font-medium">{encounter.vitalSigns.bloodPressure}</span>
                                  </div>
                                )}
                                {encounter.vitalSigns.heartRate && (
                                  <div className="flex justify-between p-2 bg-muted rounded">
                                    <span className="text-muted-foreground">HR:</span>
                                    <span className="font-medium">{encounter.vitalSigns.heartRate} bpm</span>
                                  </div>
                                )}
                                {encounter.vitalSigns.oxygenSaturation && (
                                  <div className="flex justify-between p-2 bg-muted rounded">
                                    <span className="text-muted-foreground">SpO2:</span>
                                    <span className="font-medium">{encounter.vitalSigns.oxygenSaturation}%</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Diagnosis */}
                          <div>
                            <p className="text-sm font-medium mb-1">Diagnosis</p>
                            <p className="text-sm text-muted-foreground">{encounter.diagnosis}</p>
                          </div>

                          {/* Treatment Plan */}
                          <div>
                            <p className="text-sm font-medium mb-1">Treatment Plan</p>
                            <p className="text-sm text-muted-foreground">{encounter.treatmentPlan}</p>
                          </div>

                          <Separator />

                          {/* Actions */}
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1">
                              <FileText className="h-3 w-3 mr-2" />
                              View Full Details
                            </Button>
                            <Button variant="default" size="sm" className="flex-1">
                              <Brain className="h-3 w-3 mr-2" />
                              Run AI Analysis
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Encounters Yet</h3>
                      <p className="text-sm text-muted-foreground max-w-sm mb-4">
                        This patient has no documented clinical encounters in the system.
                      </p>
                      <Button>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Create First Encounter
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Vital Signs Tab */}
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
                        {vitalSigns.map((record) => (
                          <div key={record.id} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-sm font-medium">
                                {format(new Date(record.createdAt), "MMM d, yyyy 'at' h:mm a")}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              {record.vitalSigns?.temperature && (
                                <div className="p-2 bg-muted rounded">
                                  <p className="text-muted-foreground text-xs">Temperature</p>
                                  <p className="font-medium">{record.vitalSigns.temperature}°F</p>
                                </div>
                              )}
                              {record.vitalSigns?.bloodPressure && (
                                <div className="p-2 bg-muted rounded">
                                  <p className="text-muted-foreground text-xs">Blood Pressure</p>
                                  <p className="font-medium">{record.vitalSigns.bloodPressure}</p>
                                </div>
                              )}
                              {record.vitalSigns?.heartRate && (
                                <div className="p-2 bg-muted rounded">
                                  <p className="text-muted-foreground text-xs">Heart Rate</p>
                                  <p className="font-medium">{record.vitalSigns.heartRate} bpm</p>
                                </div>
                              )}
                              {record.vitalSigns?.oxygenSaturation && (
                                <div className="p-2 bg-muted rounded">
                                  <p className="text-muted-foreground text-xs">SpO2</p>
                                  <p className="font-medium">{record.vitalSigns.oxygenSaturation}%</p>
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
                      <p className="text-sm text-muted-foreground">
                        No vital signs have been recorded for this patient yet.
                      </p>
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
                        {diagnosisHistory.map((record) => (
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
                                    {record.differentialDiagnosis.map((diff, index) => (
                                      <Badge key={index} variant="outline" className="text-xs">
                                        {diff}
                                      </Badge>
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
                      <p className="text-sm text-muted-foreground">
                        No diagnoses have been documented for this patient yet.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
