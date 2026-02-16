import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Plus, X, Loader2, FileText, Activity, Beaker } from "lucide-react";
import { Link, useLocation, useParams } from "wouter";

// Protocol definitions
const PROTOCOL_DATA: Record<string, {
  name: string;
  chiefComplaint: string;
  suggestedSymptoms: string[];
  suggestedDifferentials: string[];
  labTemplates: string[];
}> = {
  fatigue: {
    name: "Fatigue Diagnostic Evaluation Protocol",
    chiefComplaint: "Fatigue",
    suggestedSymptoms: [
      "Persistent tiredness",
      "Difficulty concentrating",
      "Reduced energy levels",
      "Sleep disturbances"
    ],
    suggestedDifferentials: [
      "Hypothyroidism",
      "Iron deficiency anemia",
      "Vitamin D deficiency",
      "Depression",
      "Sleep apnea",
      "Chronic fatigue syndrome"
    ],
    labTemplates: ["first_line", "additional", "specialized"]
  }
};

export default function NewEncounterWithProtocol() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams();
  const protocolId = params.protocolId || "";
  const protocol = PROTOCOL_DATA[protocolId];

  // Patient selection
  const [selectedPatientId, setSelectedPatientId] = useState<number | undefined>();
  
  const { data: patients } = trpc.patients.list.useQuery({});
  const { data: patient } = trpc.patients.getById.useQuery(
    { id: selectedPatientId! },
    { enabled: !!selectedPatientId }
  );

  // SOAP Note fields - pre-filled from protocol
  const [chiefComplaint, setChiefComplaint] = useState(protocol?.chiefComplaint || "");
  const [symptomInput, setSymptomInput] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  
  // Vital Signs
  const [temperature, setTemperature] = useState("");
  const [bloodPressure, setBloodPressure] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [respiratoryRate, setRespiratoryRate] = useState("");
  const [oxygenSaturation, setOxygenSaturation] = useState("");
  
  const [physicalExamFindings, setPhysicalExamFindings] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [differentialInput, setDifferentialInput] = useState("");
  const [differentialDiagnosis, setDifferentialDiagnosis] = useState<string[]>([]);
  const [treatmentPlan, setTreatmentPlan] = useState("");

  // Lab orders
  const [selectedLabTemplates, setSelectedLabTemplates] = useState<string[]>([]);
  const { data: labTemplates } = trpc.protocols.getLabTemplates.useQuery({ protocolId });

  const createEncounter = trpc.dao.create.useMutation({
    onSuccess: async (data) => {
      // Record protocol application
      if (protocol && selectedPatientId) {
        await applyProtocol.mutateAsync({
          protocolId,
          protocolName: protocol.name,
          daoEntryId: data.id,
          patientId: selectedPatientId,
          sectionsUsed: ["initial_assessment", "differential_diagnosis", "lab_workup"]
        });
      }
      
      toast.success("Clinical encounter documented successfully!");
      setLocation(`/patients/${selectedPatientId}`);
    },
    onError: (error) => {
      toast.error(`Failed to create encounter: ${error.message}`);
    },
  });

  const applyProtocol = trpc.protocols.applyProtocol.useMutation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPatientId || !chiefComplaint || !diagnosis || !treatmentPlan) {
      toast.error("Please fill in all required fields");
      return;
    }

    const vitalSigns: any = {};
    if (temperature) vitalSigns.temperature = parseFloat(temperature);
    if (bloodPressure) vitalSigns.bloodPressure = bloodPressure;
    if (heartRate) vitalSigns.heartRate = parseInt(heartRate);
    if (respiratoryRate) vitalSigns.respiratoryRate = parseInt(respiratoryRate);
    if (oxygenSaturation) vitalSigns.oxygenSaturation = parseInt(oxygenSaturation);

    createEncounter.mutate({
      patientId: selectedPatientId,
      chiefComplaint,
      symptoms: symptoms.length > 0 ? symptoms : [],
      vitalSigns: Object.keys(vitalSigns).length > 0 ? vitalSigns : undefined,
      physicalExamFindings: physicalExamFindings || undefined,
      diagnosis,
      differentialDiagnosis: differentialDiagnosis.length > 0 ? differentialDiagnosis : undefined,
      treatmentPlan,
      status: "completed",
    });
  };

  const addSymptom = () => {
    if (symptomInput.trim()) {
      setSymptoms([...symptoms, symptomInput.trim()]);
      setSymptomInput("");
    }
  };

  const removeSymptom = (index: number) => {
    setSymptoms(symptoms.filter((_, i) => i !== index));
  };

  const addDifferential = () => {
    if (differentialInput.trim()) {
      setDifferentialDiagnosis([...differentialDiagnosis, differentialInput.trim()]);
      setDifferentialInput("");
    }
  };

  const removeDifferential = (index: number) => {
    setDifferentialDiagnosis(differentialDiagnosis.filter((_, i) => i !== index));
  };

  const addSuggestedSymptom = (symptom: string) => {
    if (!symptoms.includes(symptom)) {
      setSymptoms([...symptoms, symptom]);
    }
  };

  const addSuggestedDifferential = (differential: string) => {
    if (!differentialDiagnosis.includes(differential)) {
      setDifferentialDiagnosis([...differentialDiagnosis, differential]);
    }
  };

  if (!protocol) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Protocol Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested protocol does not exist</p>
          <Link href="/library">
            <Button>Return to Library</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center gap-4">
            <Link href={`/protocols/${protocolId}`}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <FileText className="h-8 w-8" />
                Apply Protocol: {protocol.name}
              </h1>
              <p className="text-muted-foreground mt-1">
                Pre-filled encounter form with protocol guidance
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container py-8">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
          {/* Patient Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Patient</CardTitle>
              <CardDescription>Choose the patient for this encounter</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedPatientId?.toString()} onValueChange={(val) => setSelectedPatientId(parseInt(val))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a patient..." />
                </SelectTrigger>
                <SelectContent>
                  {patients?.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.firstName} {p.lastName} (MRN: {p.mrn})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {patient && (
                <div className="mt-3 p-3 bg-blue-50 rounded-md text-sm">
                  <strong>Selected:</strong> {patient.firstName} {patient.lastName} • DOB: {new Date(patient.dateOfBirth).toLocaleDateString()} • MRN: {patient.mrn}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subjective */}
          <Card>
            <CardHeader>
              <CardTitle>Subjective (S)</CardTitle>
              <CardDescription>Chief complaint and patient-reported symptoms</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="chiefComplaint">Chief Complaint *</Label>
                <Input
                  id="chiefComplaint"
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder="e.g., Fatigue for 3 months"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Symptoms</Label>
                <div className="flex gap-2">
                  <Input
                    value={symptomInput}
                    onChange={(e) => setSymptomInput(e.target.value)}
                    placeholder="Add symptom..."
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSymptom())}
                  />
                  <Button type="button" onClick={addSymptom} size="icon" variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Suggested symptoms from protocol */}
                {protocol.suggestedSymptoms.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-md">
                    <p className="text-sm font-semibold text-blue-900 mb-2">Protocol Suggestions:</p>
                    <div className="flex flex-wrap gap-2">
                      {protocol.suggestedSymptoms.map((symptom, idx) => (
                        <Button
                          key={idx}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addSuggestedSymptom(symptom)}
                          className="text-xs"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {symptom}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {symptoms.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {symptoms.map((symptom, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        {symptom}
                        <button
                          type="button"
                          onClick={() => removeSymptom(index)}
                          className="ml-1 hover:bg-secondary-foreground/20 rounded-full"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Objective */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Objective (O)
              </CardTitle>
              <CardDescription>Vital signs and physical examination findings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-base font-semibold mb-3 block">Vital Signs</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="temperature">Temperature (°F)</Label>
                    <Input
                      id="temperature"
                      type="number"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      placeholder="98.6"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bloodPressure">Blood Pressure</Label>
                    <Input
                      id="bloodPressure"
                      value={bloodPressure}
                      onChange={(e) => setBloodPressure(e.target.value)}
                      placeholder="120/80"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="heartRate">Heart Rate (bpm)</Label>
                    <Input
                      id="heartRate"
                      type="number"
                      value={heartRate}
                      onChange={(e) => setHeartRate(e.target.value)}
                      placeholder="72"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="respiratoryRate">Respiratory Rate</Label>
                    <Input
                      id="respiratoryRate"
                      type="number"
                      value={respiratoryRate}
                      onChange={(e) => setRespiratoryRate(e.target.value)}
                      placeholder="16"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="oxygenSaturation">SpO2 (%)</Label>
                    <Input
                      id="oxygenSaturation"
                      type="number"
                      value={oxygenSaturation}
                      onChange={(e) => setOxygenSaturation(e.target.value)}
                      placeholder="98"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="physicalExam">Physical Examination Findings</Label>
                <Textarea
                  id="physicalExam"
                  value={physicalExamFindings}
                  onChange={(e) => setPhysicalExamFindings(e.target.value)}
                  placeholder="Document physical examination findings..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Assessment */}
          <Card>
            <CardHeader>
              <CardTitle>Assessment (A)</CardTitle>
              <CardDescription>Clinical impression and differential diagnosis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="diagnosis">Primary Diagnosis *</Label>
                <Input
                  id="diagnosis"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="e.g., Fatigue, unspecified (R53.83)"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Differential Diagnosis</Label>
                <div className="flex gap-2">
                  <Input
                    value={differentialInput}
                    onChange={(e) => setDifferentialInput(e.target.value)}
                    placeholder="Add differential diagnosis..."
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addDifferential())}
                  />
                  <Button type="button" onClick={addDifferential} size="icon" variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Suggested differentials from protocol */}
                {protocol.suggestedDifferentials.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-md">
                    <p className="text-sm font-semibold text-blue-900 mb-2">Protocol Suggestions:</p>
                    <div className="flex flex-wrap gap-2">
                      {protocol.suggestedDifferentials.map((diff, idx) => (
                        <Button
                          key={idx}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addSuggestedDifferential(diff)}
                          className="text-xs"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {diff}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {differentialDiagnosis.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {differentialDiagnosis.map((diff, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        {diff}
                        <button
                          type="button"
                          onClick={() => removeDifferential(index)}
                          className="ml-1 hover:bg-secondary-foreground/20 rounded-full"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Lab Orders */}
          {labTemplates && labTemplates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Beaker className="h-5 w-5" />
                  Laboratory Orders
                </CardTitle>
                <CardDescription>Protocol-recommended lab tests</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {labTemplates.map((template: any) => (
                  <div key={template.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">{template.templateName}</h4>
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {template.category.replace('_', ' ')}
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant={selectedLabTemplates.includes(template.id.toString()) ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          if (selectedLabTemplates.includes(template.id.toString())) {
                            setSelectedLabTemplates(selectedLabTemplates.filter(id => id !== template.id.toString()));
                          } else {
                            setSelectedLabTemplates([...selectedLabTemplates, template.id.toString()]);
                          }
                        }}
                      >
                        {selectedLabTemplates.includes(template.id.toString()) ? "Selected" : "Select"}
                      </Button>
                    </div>
                    <div className="mt-3 text-sm space-y-1">
                      {template.labTests.map((test: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-2 text-muted-foreground">
                          <span>•</span>
                          <span><strong>{test.testName}</strong> (CPT: {test.testCode})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Plan */}
          <Card>
            <CardHeader>
              <CardTitle>Plan (P)</CardTitle>
              <CardDescription>Treatment plan and follow-up</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="treatmentPlan">Treatment Plan *</Label>
                <Textarea
                  id="treatmentPlan"
                  value={treatmentPlan}
                  onChange={(e) => setTreatmentPlan(e.target.value)}
                  placeholder="Document treatment plan, medications, referrals, and follow-up..."
                  rows={6}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-3">
            <Button
              type="submit"
              size="lg"
              disabled={createEncounter.isPending}
              className="flex-1"
            >
              {createEncounter.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Complete Encounter"
              )}
            </Button>
            <Link href={`/protocols/${protocolId}`}>
              <Button type="button" variant="outline" size="lg">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
