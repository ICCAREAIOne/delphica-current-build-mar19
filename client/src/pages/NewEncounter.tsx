import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Plus, X, Loader2, FileText, Activity } from "lucide-react";
import { Link, useLocation, useParams } from "wouter";

export default function NewEncounter() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams();
  const patientId = params.patientId ? parseInt(params.patientId) : undefined;

  const { data: patient } = trpc.patients.getById.useQuery(
    { id: patientId! },
    { enabled: !!patientId }
  );

  // SOAP Note fields
  const [chiefComplaint, setChiefComplaint] = useState("");
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

  const createEncounter = trpc.dao.create.useMutation({
    onSuccess: (data) => {
      toast.success("Clinical encounter documented successfully!");
      setLocation(`/patients/${patientId}`);
    },
    onError: (error) => {
      toast.error(`Failed to create encounter: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!patientId || !chiefComplaint || !diagnosis || !treatmentPlan) {
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
      patientId,
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

  if (!patientId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Invalid Patient</h2>
          <p className="text-muted-foreground mb-4">No patient ID provided</p>
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
      <header className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center gap-4">
            <Link href={`/patients/${patientId}`}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <FileText className="h-8 w-8" />
                New Clinical Encounter
              </h1>
              {patient && (
                <p className="text-muted-foreground mt-1">
                  Patient: {patient.firstName} {patient.lastName} (MRN: {patient.mrn})
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container py-8">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
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
                  placeholder="e.g., Chest pain for 2 hours"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Symptoms</Label>
                <div className="flex gap-2">
                  <Input
                    value={symptomInput}
                    onChange={(e) => setSymptomInput(e.target.value)}
                    placeholder="e.g., Shortness of breath, Nausea"
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSymptom())}
                  />
                  <Button type="button" onClick={addSymptom} size="icon" variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
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

              {/* Fatigue Protocol Screening */}
              {(chiefComplaint.toLowerCase().includes('fatigue') || 
                chiefComplaint.toLowerCase().includes('tired') || 
                chiefComplaint.toLowerCase().includes('exhausted') ||
                symptoms.some(s => s.toLowerCase().includes('fatigue') || s.toLowerCase().includes('tired'))) && (
                <div className="border-l-4 border-blue-500 bg-blue-50 p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    <Label className="text-base font-semibold text-blue-900">Fatigue Protocol Screening</Label>
                  </div>
                  <p className="text-sm text-blue-700 mb-3">
                    Based on the chief complaint, consider these key screening questions:
                  </p>
                  <div className="grid gap-2 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-blue-600 font-semibold">•</span>
                      <span className="text-gray-700"><strong>Hydration:</strong> Daily water intake? Urine color/frequency? Signs of dehydration?</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-600 font-semibold">•</span>
                      <span className="text-gray-700"><strong>Caffeine:</strong> Coffee/tea/energy drinks (quantity, timing)? Recent changes in intake?</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-600 font-semibold">•</span>
                      <span className="text-gray-700"><strong>Stimulants:</strong> Prescription stimulants? OTC supplements? Pattern of use?</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-600 font-semibold">•</span>
                      <span className="text-gray-700"><strong>Sleep:</strong> Hours per night? Quality? STOP-BANG score?</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-600 font-semibold">•</span>
                      <span className="text-gray-700"><strong>Mood:</strong> PHQ-9 score? Recent stressors?</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <Link href="/protocols/fatigue">
                      <Button type="button" variant="outline" size="sm" className="text-blue-700 border-blue-300 hover:bg-blue-100">
                        <FileText className="h-4 w-4 mr-2" />
                        View Full Fatigue Protocol
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
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
                  placeholder="Document physical exam findings..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Assessment */}
          <Card>
            <CardHeader>
              <CardTitle>Assessment (A)</CardTitle>
              <CardDescription>Diagnosis and differential diagnoses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="diagnosis">Primary Diagnosis *</Label>
                <Input
                  id="diagnosis"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="e.g., Acute Myocardial Infarction"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Differential Diagnoses</Label>
                <div className="flex gap-2">
                  <Input
                    value={differentialInput}
                    onChange={(e) => setDifferentialInput(e.target.value)}
                    placeholder="e.g., Unstable Angina, Pulmonary Embolism"
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addDifferential())}
                  />
                  <Button type="button" onClick={addDifferential} size="icon" variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {differentialDiagnosis.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {differentialDiagnosis.map((diff, index) => (
                      <Badge key={index} variant="outline" className="gap-1">
                        {diff}
                        <button
                          type="button"
                          onClick={() => removeDifferential(index)}
                          className="ml-1 hover:bg-muted rounded-full"
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
                  placeholder="Document treatment plan, medications, procedures, and follow-up..."
                  rows={6}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-4 justify-end">
            <Link href={`/patients/${patientId}`}>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={createEncounter.isPending}>
              {createEncounter.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving Encounter...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Save Encounter
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
