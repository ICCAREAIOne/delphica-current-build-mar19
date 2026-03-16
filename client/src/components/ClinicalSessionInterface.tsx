import { useState, useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, FileText, Pill, Activity, CheckCircle2, XCircle } from 'lucide-react';
import { TreatmentRecommendations } from './TreatmentRecommendations';
import { CollaborationPanel } from './CollaborationPanel';
import { DelphiSimulator } from './DelphiSimulator';
import { useAuth } from '@/_core/hooks/useAuth';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ClinicalSessionInterfaceProps {
  patientId: number;
  patientName: string;
}

export function ClinicalSessionInterface({ patientId, patientName }: ClinicalSessionInterfaceProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [showDiagnosisDialog, setShowDiagnosisDialog] = useState(false);
  const [showTreatmentDialog, setShowTreatmentDialog] = useState(false);
  const [showDelphiSimulator, setShowDelphiSimulator] = useState(false);
  const [cptCodeInput, setCptCodeInput] = useState('');
  const [cptValidation, setCptValidation] = useState<{ valid: boolean; shortDesc?: string; reason?: string } | null>(null);
  const cptDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedDiagnosisForSimulation, setSelectedDiagnosisForSimulation] = useState<{ code: string; name: string } | null>(null);
  const [diagCodeInput, setDiagCodeInput] = useState('');
  const [diagValidation, setDiagValidation] = useState<{ valid: boolean; shortDesc?: string; longDesc?: string; reason?: string; isUnspecified?: boolean } | null>(null);
  const diagDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch patient sessions
  const { data: sessions, refetch: refetchSessions } = trpc.daoProtocol.getPatientSessions.useQuery({ patientId });

  // Fetch active session details
  const { data: activeSession, refetch: refetchSession } = trpc.daoProtocol.getSession.useQuery(
    { sessionId: activeSessionId! },
    { enabled: !!activeSessionId }
  );

  // Fetch diagnoses for active session
  const { data: diagnoses, refetch: refetchDiagnoses } = trpc.daoProtocol.getDiagnosesBySession.useQuery(
    { sessionId: activeSessionId! },
    { enabled: !!activeSessionId }
  );

  // Fetch treatments for active session
  const { data: treatments, refetch: refetchTreatments } = trpc.daoProtocol.getTreatmentsBySession.useQuery(
    { sessionId: activeSessionId! },
    { enabled: !!activeSessionId }
  );

  // Create session mutation
  const createSession = trpc.daoProtocol.createSession.useMutation({
    onSuccess: (data) => {
      toast({ title: 'Clinical session created successfully' });
      setActiveSessionId(data.sessionId);
      refetchSessions();
      setShowNewSessionDialog(false);
    },
    onError: (error) => {
      toast({ title: 'Error creating session', description: error.message, variant: 'destructive' });
    },
  });

  // Add diagnosis mutation
  const addDiagnosis = trpc.daoProtocol.addDiagnosis.useMutation({
    onSuccess: () => {
      toast({ title: 'Diagnosis added successfully' });
      refetchDiagnoses();
      setShowDiagnosisDialog(false);
    },
    onError: (error) => {
      toast({ title: 'Error adding diagnosis', description: error.message, variant: 'destructive' });
    },
  });

  // Add treatment mutation
  const addTreatment = trpc.daoProtocol.addTreatment.useMutation({
    onSuccess: () => {
      toast({ title: 'Treatment added successfully' });
      refetchTreatments();
      setShowTreatmentDialog(false);
    },
    onError: (error) => {
      toast({ title: 'Error adding treatment', description: error.message, variant: 'destructive' });
    },
  });

  // Complete session mutation
  const completeSession = trpc.daoProtocol.completeSession.useMutation({
    onSuccess: () => {
      toast({ title: 'Session completed successfully' });
      refetchSessions();
      setActiveSessionId(null);
    },
    onError: (error) => {
      toast({ title: 'Error completing session', description: error.message, variant: 'destructive' });
    },
  });

  const handleCreateSession = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createSession.mutate({
      patientId,
      sessionType: formData.get('sessionType') as any,
      sessionDate: new Date().toISOString(),
      chiefComplaint: formData.get('chiefComplaint') as string,
    });
  };

  const handleAddDiagnosis = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeSessionId) return;
    
    const formData = new FormData(e.currentTarget);
    const symptomsStr = formData.get('symptoms') as string;
    const symptoms = symptomsStr ? symptomsStr.split(',').map(s => s.trim()) : [];
    
    addDiagnosis.mutate({
      sessionId: activeSessionId,
      diagnosisCode: formData.get('diagnosisCode') as string || undefined,
      diagnosisName: formData.get('diagnosisName') as string,
      diagnosisType: formData.get('diagnosisType') as any,
      severity: formData.get('severity') as any || undefined,
      onset: formData.get('onset') as string || undefined,
      duration: formData.get('duration') as string || undefined,
      symptoms: symptoms.length > 0 ? symptoms : undefined,
      clinicalNotes: formData.get('clinicalNotes') as string || undefined,
    });
  };

  const handleAddTreatment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeSessionId) return;
    
    const formData = new FormData(e.currentTarget);
    
    addTreatment.mutate({
      sessionId: activeSessionId,
      treatmentType: formData.get('treatmentType') as any,
      treatmentName: formData.get('treatmentName') as string,
      treatmentCode: cptCodeInput || undefined,
      dosage: formData.get('dosage') as string || undefined,
      frequency: formData.get('frequency') as string || undefined,
      route: formData.get('route') as string || undefined,
      duration: formData.get('duration') as string || undefined,
      instructions: formData.get('instructions') as string || undefined,
      rationale: formData.get('rationale') as string || undefined,
    });
    setCptCodeInput('');
    setCptValidation(null);
  };

  const validateDiag = trpc.causalBrain.validateDiagnosisCode.useQuery(
    { code: diagCodeInput },
    { enabled: diagCodeInput.length >= 3, staleTime: 30_000 }
  );
  useEffect(() => {
    if (diagCodeInput.length < 3) { setDiagValidation(null); return; }
    if (diagDebounceRef.current) clearTimeout(diagDebounceRef.current);
    diagDebounceRef.current = setTimeout(() => {
      if (validateDiag.data) {
        if (validateDiag.data.valid) {
          const isUnspecified = validateDiag.data.shortDesc?.toLowerCase().includes('unspecified') ||
            validateDiag.data.longDesc?.toLowerCase().includes('unspecified');
          setDiagValidation({ valid: true, shortDesc: validateDiag.data.shortDesc, longDesc: validateDiag.data.longDesc, isUnspecified });
        } else {
          setDiagValidation({ valid: false, reason: (validateDiag.data as any).reason });
        }
      }
    }, 400);
    return () => { if (diagDebounceRef.current) clearTimeout(diagDebounceRef.current); };
  }, [diagCodeInput, validateDiag.data]);
  const validateCpt = trpc.causalBrain.validateCPTCode.useQuery(
    { code: cptCodeInput },
    { enabled: cptCodeInput.length >= 4, staleTime: 30_000 }
  );

  useEffect(() => {
    if (cptCodeInput.length < 4) {
      setCptValidation(null);
      return;
    }
    if (cptDebounceRef.current) clearTimeout(cptDebounceRef.current);
    cptDebounceRef.current = setTimeout(() => {
      if (validateCpt.data) {
        if (validateCpt.data.valid) {
          setCptValidation({ valid: true, shortDesc: validateCpt.data.description });
        } else {
          setCptValidation({ valid: false, reason: validateCpt.data.reason });
        }
      }
    }, 400);
    return () => { if (cptDebounceRef.current) clearTimeout(cptDebounceRef.current); };
  }, [cptCodeInput, validateCpt.data]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">DAO Protocol - Clinical Data Entry</h2>
          <p className="text-muted-foreground">Structured diagnosis and treatment capture for {patientName}</p>
        </div>
        <Button onClick={() => setShowNewSessionDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Session
        </Button>
      </div>

      {/* Session List */}
      {sessions && sessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Clinical Sessions</CardTitle>
            <CardDescription>Previous and active clinical encounters</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-4 border rounded-lg cursor-pointer hover:bg-accent transition-colors ${
                    activeSessionId === session.id ? 'border-primary bg-accent' : ''
                  }`}
                  onClick={() => setActiveSessionId(session.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{session.sessionType.replace('_', ' ').toUpperCase()}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(session.sessionDate).toLocaleDateString()} - {session.chiefComplaint || 'No chief complaint'}
                      </div>
                    </div>
                    <Badge variant={session.status === 'completed' ? 'default' : 'secondary'}>
                      {session.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Session Details */}
      {activeSession && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Diagnoses and Treatments */}
          <div className="lg:col-span-2 space-y-6">
          {/* Diagnoses */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Diagnoses
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowDiagnosisDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {diagnoses && diagnoses.length > 0 ? (
                <div className="space-y-3">
                  {diagnoses.map((diagnosis) => (
                    <div key={diagnosis.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{diagnosis.diagnosisName}</div>
                          {diagnosis.diagnosisCode && (
                            <div className="text-sm text-muted-foreground">ICD-10: {diagnosis.diagnosisCode}</div>
                          )}
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline">{diagnosis.diagnosisType}</Badge>
                            {diagnosis.severity && <Badge variant="secondary">{diagnosis.severity}</Badge>}
                            <Badge variant={diagnosis.status === 'active' ? 'default' : 'secondary'}>
                              {diagnosis.status}
                            </Badge>
                          </div>
                        </div>
                        {diagnosis.diagnosisCode && diagnosis.diagnosisType === 'primary' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedDiagnosisForSimulation({
                                code: diagnosis.diagnosisCode!,
                                name: diagnosis.diagnosisName
                              });
                              setShowDelphiSimulator(true);
                            }}
                          >
                            Explore Scenarios
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No diagnoses recorded yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Treatments */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Pill className="h-5 w-5" />
                  Treatments
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowTreatmentDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {treatments && treatments.length > 0 ? (
                <div className="space-y-3">
                  {treatments.map((treatment) => (
                    <div key={treatment.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{treatment.treatmentName}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {treatment.dosage && `${treatment.dosage} `}
                            {treatment.frequency && `- ${treatment.frequency}`}
                          </div>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            <Badge variant="outline">{treatment.treatmentType}</Badge>
                            <Badge variant={treatment.status === 'active' ? 'default' : 'secondary'}>
                              {treatment.status}
                            </Badge>
                            {treatment.treatmentCode && (
                              <Badge variant="outline" className="font-mono text-xs bg-blue-50 text-blue-700 border-blue-200">
                                CPT {treatment.treatmentCode}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No treatments recorded yet
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* AI Treatment Recommendations */}
          {activeSessionId && (
            <TreatmentRecommendations 
          sessionId={activeSessionId} 
          onRecommendationAccepted={() => {
            refetchTreatments();
            refetchSession();
          }}
            />
          )}
          </div>
          
          {/* Right column: Collaboration Panel */}
          <div className="lg:col-span-1">
            {user && activeSessionId && (
              <CollaborationPanel 
                sessionId={activeSessionId} 
                currentUserId={user.id}
              />
            )}
          </div>
        </div>
      )}

      {/* Complete Session Button */}
      {activeSession && activeSession.status === 'in_progress' && (
        <div className="flex justify-end">
          <Button
            onClick={() => activeSessionId && completeSession.mutate({ sessionId: activeSessionId })}
            disabled={completeSession.isPending}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Complete Session
          </Button>
        </div>
      )}

      {/* New Session Dialog */}
      <Dialog open={showNewSessionDialog} onOpenChange={setShowNewSessionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Clinical Session</DialogTitle>
            <DialogDescription>Start a new clinical encounter for {patientName}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSession}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sessionType">Session Type *</Label>
                <Select name="sessionType" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select session type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="initial_consultation">Initial Consultation</SelectItem>
                    <SelectItem value="follow_up">Follow-up</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="routine_checkup">Routine Checkup</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="chiefComplaint">Chief Complaint</Label>
                <Textarea
                  id="chiefComplaint"
                  name="chiefComplaint"
                  placeholder="Primary reason for visit..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowNewSessionDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createSession.isPending}>
                {createSession.isPending ? 'Creating...' : 'Create Session'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Diagnosis Dialog */}
      <Dialog open={showDiagnosisDialog} onOpenChange={(open) => { setShowDiagnosisDialog(open); if (!open) { setDiagCodeInput(''); setDiagValidation(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Diagnosis</DialogTitle>
            <DialogDescription>Record a new diagnosis for this session</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddDiagnosis}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="diagnosisName">Diagnosis Name *</Label>
                  <Input
                    id="diagnosisName"
                    name="diagnosisName"
                    placeholder="e.g., Hypertension"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diagnosisCode">ICD-10 Code</Label>
                  <Input
                    id="diagnosisCode"
                    name="diagnosisCode"
                    placeholder="e.g., I10"
                    value={diagCodeInput}
                    onChange={(e) => { setDiagCodeInput(e.target.value.toUpperCase()); setDiagValidation(null); }}
                  />
                  {/* ICD-10 Validation Badge */}
                  {diagCodeInput.length >= 3 && (
                    <div className={`mt-1 px-2 py-1 rounded text-xs flex items-start gap-1.5 ${
                      diagValidation === null ? 'bg-muted text-muted-foreground' :
                      diagValidation.valid && !diagValidation.isUnspecified ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      diagValidation.valid && diagValidation.isUnspecified ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {diagValidation === null && <span>Validating…</span>}
                      {diagValidation?.valid && !diagValidation.isUnspecified && (
                        <><CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0" /><span><strong>Valid:</strong> {diagValidation.shortDesc}</span></>
                      )}
                      {diagValidation?.valid && diagValidation.isUnspecified && (
                        <><span className="shrink-0">⚠</span><span><strong>Unspecified:</strong> {diagValidation.shortDesc} — consider a more specific subcode</span></>
                      )}
                      {diagValidation && !diagValidation.valid && (
                        <><XCircle className="h-3 w-3 mt-0.5 shrink-0" /><span><strong>Invalid:</strong> {diagValidation.reason}</span></>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="diagnosisType">Type *</Label>
                  <Select name="diagnosisType" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Primary</SelectItem>
                      <SelectItem value="secondary">Secondary</SelectItem>
                      <SelectItem value="differential">Differential</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="severity">Severity</Label>
                  <Select name="severity">
                    <SelectTrigger>
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mild">Mild</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="severe">Severe</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="onset">Onset</Label>
                  <Input
                    id="onset"
                    name="onset"
                    placeholder="e.g., 2 weeks ago"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                  <Input
                    id="duration"
                    name="duration"
                    placeholder="e.g., Ongoing"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="symptoms">Symptoms (comma-separated)</Label>
                <Input
                  id="symptoms"
                  name="symptoms"
                  placeholder="e.g., headache, dizziness, fatigue"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinicalNotes">Clinical Notes</Label>
                <Textarea
                  id="clinicalNotes"
                  name="clinicalNotes"
                  placeholder="Additional clinical observations..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowDiagnosisDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addDiagnosis.isPending}>
                {addDiagnosis.isPending ? 'Adding...' : 'Add Diagnosis'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Treatment Dialog */}
      <Dialog open={showTreatmentDialog} onOpenChange={setShowTreatmentDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Treatment</DialogTitle>
            <DialogDescription>Record a new treatment for this session</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddTreatment}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="treatmentName">Treatment Name *</Label>
                  <Input
                    id="treatmentName"
                    name="treatmentName"
                    placeholder="e.g., Lisinopril"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="treatmentType">Type *</Label>
                  <Select name="treatmentType" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="medication">Medication</SelectItem>
                      <SelectItem value="procedure">Procedure</SelectItem>
                      <SelectItem value="therapy">Therapy</SelectItem>
                      <SelectItem value="lifestyle">Lifestyle</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dosage">Dosage</Label>
                  <Input
                    id="dosage"
                    name="dosage"
                    placeholder="e.g., 10mg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Input
                    id="frequency"
                    name="frequency"
                    placeholder="e.g., Once daily"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="route">Route</Label>
                  <Input
                    id="route"
                    name="route"
                    placeholder="e.g., Oral"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Input
                  id="duration"
                  name="duration"
                  placeholder="e.g., 30 days"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea
                  id="instructions"
                  name="instructions"
                  placeholder="Patient instructions..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rationale">Rationale</Label>
                <Textarea
                  id="rationale"
                  name="rationale"
                  placeholder="Why this treatment was chosen..."
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowTreatmentDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addTreatment.isPending}>
                {addTreatment.isPending ? 'Adding...' : 'Add Treatment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delphi Simulator Dialog */}
      <Dialog open={showDelphiSimulator} onOpenChange={setShowDelphiSimulator}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          {showDelphiSimulator && activeSessionId && selectedDiagnosisForSimulation && (
            <DelphiSimulator
              sessionId={activeSessionId}
              diagnosisCode={selectedDiagnosisForSimulation.code}
              diagnosisName={selectedDiagnosisForSimulation.name}
              onClose={() => {
                setShowDelphiSimulator(false);
                setSelectedDiagnosisForSimulation(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
