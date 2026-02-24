import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProtocolTemplateLibrary } from './ProtocolTemplateLibrary';
import { AlertCircle, Plus, X, Save, Send, Eye, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { trpc } from '@/lib/trpc';

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  instructions?: string;
}

interface Intervention {
  category: string;
  items: string[];
}

interface FollowUp {
  frequency: string;
  metrics: string[];
}

interface ProtocolData {
  title: string;
  diagnosis: string;
  duration: string;
  goals: string[];
  interventions: Intervention[];
  medications?: Medication[];
  lifestyle?: string[];
  followUp?: FollowUp;
  warnings?: string[];
}

interface ProtocolCustomizationDialogProps {
  open: boolean;
  onClose: () => void;
  carePlan: any;
  patientAllergies?: string[];
  onSend: (customizedProtocol: ProtocolData) => void;
  isSending?: boolean;
}

export function ProtocolCustomizationDialog({
  open,
  onClose,
  carePlan,
  patientAllergies = [],
  onSend,
  isSending = false,
}: ProtocolCustomizationDialogProps) {
  const { toast } = useToast();
  const [protocol, setProtocol] = useState<ProtocolData>({
    title: '',
    diagnosis: '',
    duration: '12 weeks',
    goals: [],
    interventions: [],
    medications: [],
    lifestyle: [],
    followUp: {
      frequency: 'Every 2 weeks',
      metrics: [],
    },
    warnings: [],
  });

  const [newGoal, setNewGoal] = useState('');
  const [newLifestyle, setNewLifestyle] = useState('');
  const [newWarning, setNewWarning] = useState('');
  const [newMetric, setNewMetric] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [drugSafetyResults, setDrugSafetyResults] = useState<any>(null);
  const [checkingDrugSafety, setCheckingDrugSafety] = useState(false);

  // Drug safety check mutation
  const checkDrugSafety = trpc.drugSafety.checkInteractions.useMutation();

  // Initialize protocol from care plan
  useEffect(() => {
    if (carePlan && open) {
      const planData = typeof carePlan.plan === 'string' ? JSON.parse(carePlan.plan) : carePlan.plan;
      
      setProtocol({
        title: carePlan.title || 'Care Protocol',
        diagnosis: carePlan.diagnosis || planData.diagnosis || '',
        duration: planData.duration || '12 weeks',
        goals: planData.goals || [],
        interventions: planData.interventions || [],
        medications: planData.medications || [],
        lifestyle: planData.lifestyle || [],
        followUp: planData.followUp || {
          frequency: 'Every 2 weeks',
          metrics: ['Symptoms', 'Lab results', 'Adherence'],
        },
        warnings: planData.warnings || [],
      });
    }
  }, [carePlan, open]);

  // Run comprehensive drug safety check
  const runDrugSafetyCheck = async () => {
    if (!protocol.medications || protocol.medications.length === 0) {
      setDrugSafetyResults(null);
      return;
    }

    setCheckingDrugSafety(true);
    try {
      const result = await checkDrugSafety.mutateAsync({
        medications: protocol.medications.filter(m => m.name.trim() !== ''),
        allergies: patientAllergies,
      });
      setDrugSafetyResults(result);
    } catch (error) {
      console.error('Drug safety check failed:', error);
      toast({
        title: 'Drug Safety Check Failed',
        description: 'Unable to check for drug interactions. Please review manually.',
        variant: 'destructive',
      });
    } finally {
      setCheckingDrugSafety(false);
    }
  };

  // Check for allergen conflicts (simple version)
  const checkAllergenConflicts = () => {
    const conflicts: string[] = [];
    
    protocol.medications?.forEach(med => {
      patientAllergies.forEach(allergy => {
        if (med.name.toLowerCase().includes(allergy.toLowerCase()) || 
            allergy.toLowerCase().includes(med.name.toLowerCase())) {
          conflicts.push(`${med.name} may conflict with allergy: ${allergy}`);
        }
      });
    });

    return conflicts;
  };

  const allergenConflicts = checkAllergenConflicts();
  const hasCriticalIssues = (drugSafetyResults?.criticalIssuesCount || 0) > 0;

  // Add/Remove handlers
  const addGoal = () => {
    if (newGoal.trim()) {
      setProtocol(prev => ({
        ...prev,
        goals: [...prev.goals, newGoal.trim()],
      }));
      setNewGoal('');
    }
  };

  const removeGoal = (index: number) => {
    setProtocol(prev => ({
      ...prev,
      goals: prev.goals.filter((_, i) => i !== index),
    }));
  };

  const addLifestyle = () => {
    if (newLifestyle.trim()) {
      setProtocol(prev => ({
        ...prev,
        lifestyle: [...(prev.lifestyle || []), newLifestyle.trim()],
      }));
      setNewLifestyle('');
    }
  };

  const removeLifestyle = (index: number) => {
    setProtocol(prev => ({
      ...prev,
      lifestyle: prev.lifestyle?.filter((_, i) => i !== index),
    }));
  };

  const addWarning = () => {
    if (newWarning.trim()) {
      setProtocol(prev => ({
        ...prev,
        warnings: [...(prev.warnings || []), newWarning.trim()],
      }));
      setNewWarning('');
    }
  };

  const removeWarning = (index: number) => {
    setProtocol(prev => ({
      ...prev,
      warnings: prev.warnings?.filter((_, i) => i !== index),
    }));
  };

  const addMetric = () => {
    if (newMetric.trim()) {
      setProtocol(prev => ({
        ...prev,
        followUp: {
          ...prev.followUp!,
          metrics: [...(prev.followUp?.metrics || []), newMetric.trim()],
        },
      }));
      setNewMetric('');
    }
  };

  const removeMetric = (index: number) => {
    setProtocol(prev => ({
      ...prev,
      followUp: {
        ...prev.followUp!,
        metrics: prev.followUp?.metrics.filter((_, i) => i !== index) || [],
      },
    }));
  };

  const addMedication = () => {
    setProtocol(prev => ({
      ...prev,
      medications: [
        ...(prev.medications || []),
        { name: '', dosage: '', frequency: '', instructions: '' },
      ],
    }));
  };

  const updateMedication = (index: number, field: keyof Medication, value: string) => {
    setProtocol(prev => ({
      ...prev,
      medications: prev.medications?.map((med, i) =>
        i === index ? { ...med, [field]: value } : med
      ),
    }));
  };

  const removeMedication = (index: number) => {
    setProtocol(prev => ({
      ...prev,
      medications: prev.medications?.filter((_, i) => i !== index),
    }));
  };

  const addIntervention = () => {
    setProtocol(prev => ({
      ...prev,
      interventions: [
        ...prev.interventions,
        { category: 'New Category', items: [] },
      ],
    }));
  };

  const updateInterventionCategory = (index: number, category: string) => {
    setProtocol(prev => ({
      ...prev,
      interventions: prev.interventions.map((int, i) =>
        i === index ? { ...int, category } : int
      ),
    }));
  };

  const addInterventionItem = (interventionIndex: number, item: string) => {
    if (item.trim()) {
      setProtocol(prev => ({
        ...prev,
        interventions: prev.interventions.map((int, i) =>
          i === interventionIndex
            ? { ...int, items: [...int.items, item.trim()] }
            : int
        ),
      }));
    }
  };

  const removeInterventionItem = (interventionIndex: number, itemIndex: number) => {
    setProtocol(prev => ({
      ...prev,
      interventions: prev.interventions.map((int, i) =>
        i === interventionIndex
          ? { ...int, items: int.items.filter((_, j) => j !== itemIndex) }
          : int
      ),
    }));
  };

  const removeIntervention = (index: number) => {
    setProtocol(prev => ({
      ...prev,
      interventions: prev.interventions.filter((_, i) => i !== index),
    }));
  };

  const handleSend = () => {
    if (allergenConflicts.length > 0) {
      toast({
        title: 'Allergen Conflicts Detected',
        description: 'Please review and resolve allergen conflicts before sending.',
        variant: 'destructive',
      });
      return;
    }

    onSend(protocol);
  };

  if (showPreview) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Protocol Preview</DialogTitle>
            <DialogDescription>Review the customized protocol before sending</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div>
              <h3 className="font-semibold text-lg">{protocol.title}</h3>
              <p className="text-sm text-muted-foreground">Diagnosis: {protocol.diagnosis}</p>
              <p className="text-sm text-muted-foreground">Duration: {protocol.duration}</p>
            </div>

            {protocol.goals.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Treatment Goals</h4>
                <ul className="list-disc list-inside space-y-1">
                  {protocol.goals.map((goal, i) => (
                    <li key={i} className="text-sm">{goal}</li>
                  ))}
                </ul>
              </div>
            )}

            {protocol.interventions.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Interventions</h4>
                {protocol.interventions.map((intervention, i) => (
                  <div key={i} className="mb-3">
                    <h5 className="font-medium text-sm text-primary">{intervention.category}</h5>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      {intervention.items.map((item, j) => (
                        <li key={j} className="text-sm">{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {protocol.medications && protocol.medications.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Medications</h4>
                {protocol.medications.map((med, i) => (
                  <div key={i} className="mb-2 text-sm">
                    <p className="font-medium">{med.name}</p>
                    <p className="text-muted-foreground">
                      {med.dosage} - {med.frequency}
                      {med.instructions && ` - ${med.instructions}`}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {protocol.lifestyle && protocol.lifestyle.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Lifestyle Recommendations</h4>
                <ul className="list-disc list-inside space-y-1">
                  {protocol.lifestyle.map((item, i) => (
                    <li key={i} className="text-sm">{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {protocol.warnings && protocol.warnings.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 text-destructive">Important Warnings</h4>
                <ul className="space-y-1">
                  {protocol.warnings.map((warning, i) => (
                    <li key={i} className="text-sm text-destructive flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              <X className="mr-2 h-4 w-4" />
              Back to Edit
            </Button>
            <Button onClick={handleSend} disabled={isSending}>
              <Send className="mr-2 h-4 w-4" />
              {isSending ? 'Sending...' : 'Send Protocol'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customize Protocol</DialogTitle>
          <DialogDescription>
            Modify the care protocol before sending to patient
          </DialogDescription>
        </DialogHeader>

        {allergenConflicts.length > 0 && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Allergen Conflicts Detected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {allergenConflicts.map((conflict, i) => (
                  <li key={i} className="text-sm text-destructive">{conflict}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
            <TabsTrigger value="interventions">Interventions</TabsTrigger>
            <TabsTrigger value="medications">Medications</TabsTrigger>
            <TabsTrigger value="other">Other</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            <ProtocolTemplateLibrary
              onApplyTemplate={(templateData) => {
                setProtocol({
                  title: templateData.diagnosis || protocol.title,
                  diagnosis: templateData.diagnosis || protocol.diagnosis,
                  duration: templateData.duration || protocol.duration,
                  goals: templateData.goals || protocol.goals,
                  interventions: templateData.interventions || protocol.interventions,
                  medications: templateData.medications || protocol.medications,
                  lifestyle: templateData.lifestyle || protocol.lifestyle,
                  followUp: templateData.followUp || protocol.followUp,
                  warnings: templateData.warnings || protocol.warnings,
                });
              }}
            />
          </TabsContent>

          <TabsContent value="basic" className="space-y-4">
            <div>
              <Label htmlFor="title">Protocol Title</Label>
              <Input
                id="title"
                value={protocol.title}
                onChange={(e) => setProtocol(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="diagnosis">Diagnosis</Label>
              <Input
                id="diagnosis"
                value={protocol.diagnosis}
                onChange={(e) => setProtocol(prev => ({ ...prev, diagnosis: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="duration">Duration</Label>
              <Input
                id="duration"
                value={protocol.duration}
                onChange={(e) => setProtocol(prev => ({ ...prev, duration: e.target.value }))}
                placeholder="e.g., 12 weeks"
              />
            </div>
          </TabsContent>

          <TabsContent value="goals" className="space-y-4">
            <div>
              <Label>Treatment Goals</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  placeholder="Add a treatment goal"
                  onKeyPress={(e) => e.key === 'Enter' && addGoal()}
                />
                <Button onClick={addGoal} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-3 space-y-2">
                {protocol.goals.map((goal, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 border rounded">
                    <span className="flex-1 text-sm">{goal}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeGoal(i)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="interventions" className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Interventions</Label>
              <Button onClick={addIntervention} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </div>
            <div className="space-y-4">
              {protocol.interventions.map((intervention, i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Input
                        value={intervention.category}
                        onChange={(e) => updateInterventionCategory(i, e.target.value)}
                        className="font-medium"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeIntervention(i)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 mb-3">
                      <Input
                        placeholder="Add intervention item"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addInterventionItem(i, (e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      {intervention.items.map((item, j) => (
                        <div key={j} className="flex items-center gap-2 p-2 border rounded">
                          <span className="flex-1 text-sm">{item}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeInterventionItem(i, j)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="medications" className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Medications</Label>
              <div className="flex gap-2">
                <Button
                  onClick={runDrugSafetyCheck}
                  disabled={checkingDrugSafety || !protocol.medications || protocol.medications.length < 2}
                  size="sm"
                  variant="outline"
                >
                  <ShieldAlert className="mr-2 h-4 w-4" />
                  {checkingDrugSafety ? 'Checking...' : 'Check Interactions'}
                </Button>
                <Button onClick={addMedication} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Medication
                </Button>
              </div>
            </div>

            {/* Drug Safety Results */}
            {drugSafetyResults && (
              <Card className={hasCriticalIssues ? 'border-destructive' : 'border-orange-500'}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5" />
                    Drug Safety Check Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Summary */}
                  <div className="flex gap-4 text-sm">
                    {drugSafetyResults.criticalIssuesCount > 0 && (
                      <Badge variant="destructive">
                        {drugSafetyResults.criticalIssuesCount} Critical
                      </Badge>
                    )}
                    {drugSafetyResults.moderateIssuesCount > 0 && (
                      <Badge variant="outline" className="border-orange-500 text-orange-600">
                        {drugSafetyResults.moderateIssuesCount} Moderate
                      </Badge>
                    )}
                    {drugSafetyResults.minorIssuesCount > 0 && (
                      <Badge variant="secondary">
                        {drugSafetyResults.minorIssuesCount} Minor
                      </Badge>
                    )}
                  </div>

                  {/* Drug Interactions */}
                  {drugSafetyResults.drugInteractions && drugSafetyResults.drugInteractions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Drug-Drug Interactions:</p>
                      {drugSafetyResults.drugInteractions.map((interaction: any, idx: number) => (
                        <div key={idx} className="p-3 border rounded-md space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={interaction.severity === 'critical' ? 'destructive' : interaction.severity === 'moderate' ? 'outline' : 'secondary'}
                            >
                              {interaction.severity}
                            </Badge>
                            <span className="text-sm font-medium">
                              {interaction.drug1} + {interaction.drug2}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{interaction.description}</p>
                          <p className="text-sm font-medium">→ {interaction.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Allergy Conflicts */}
                  {drugSafetyResults.allergyConflicts && drugSafetyResults.allergyConflicts.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Drug-Allergy Conflicts:</p>
                      {drugSafetyResults.allergyConflicts.map((conflict: any, idx: number) => (
                        <div key={idx} className="p-3 border rounded-md space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={conflict.severity === 'critical' ? 'destructive' : conflict.severity === 'moderate' ? 'outline' : 'secondary'}
                            >
                              {conflict.severity}
                            </Badge>
                            <span className="text-sm font-medium">
                              {conflict.medication} vs {conflict.allergy}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{conflict.description}</p>
                          <p className="text-sm font-medium">→ {conflict.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            <div className="space-y-4">
              {protocol.medications?.map((med, i) => (
                <Card key={i} className={allergenConflicts.some(c => c.includes(med.name)) ? 'border-destructive' : ''}>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Medication Name</Label>
                        <Input
                          value={med.name}
                          onChange={(e) => updateMedication(i, 'name', e.target.value)}
                          placeholder="e.g., Metformin"
                        />
                      </div>
                      <div>
                        <Label>Dosage</Label>
                        <Input
                          value={med.dosage}
                          onChange={(e) => updateMedication(i, 'dosage', e.target.value)}
                          placeholder="e.g., 500mg"
                        />
                      </div>
                      <div>
                        <Label>Frequency</Label>
                        <Input
                          value={med.frequency}
                          onChange={(e) => updateMedication(i, 'frequency', e.target.value)}
                          placeholder="e.g., Twice daily"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeMedication(i)}
                          className="w-full"
                        >
                          <X className="mr-2 h-4 w-4" />
                          Remove
                        </Button>
                      </div>
                      <div className="col-span-2">
                        <Label>Instructions (Optional)</Label>
                        <Textarea
                          value={med.instructions || ''}
                          onChange={(e) => updateMedication(i, 'instructions', e.target.value)}
                          placeholder="e.g., Take with meals"
                          rows={2}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="other" className="space-y-6">
            <div>
              <Label>Lifestyle Recommendations</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newLifestyle}
                  onChange={(e) => setNewLifestyle(e.target.value)}
                  placeholder="Add lifestyle recommendation"
                  onKeyPress={(e) => e.key === 'Enter' && addLifestyle()}
                />
                <Button onClick={addLifestyle} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-3 space-y-2">
                {protocol.lifestyle?.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 border rounded">
                    <span className="flex-1 text-sm">{item}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLifestyle(i)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Follow-up Frequency</Label>
              <Input
                value={protocol.followUp?.frequency || ''}
                onChange={(e) => setProtocol(prev => ({
                  ...prev,
                  followUp: { ...prev.followUp!, frequency: e.target.value },
                }))}
                placeholder="e.g., Every 2 weeks"
                className="mt-2"
              />
            </div>

            <div>
              <Label>Follow-up Metrics</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newMetric}
                  onChange={(e) => setNewMetric(e.target.value)}
                  placeholder="Add metric to monitor"
                  onKeyPress={(e) => e.key === 'Enter' && addMetric()}
                />
                <Button onClick={addMetric} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-3 space-y-2">
                {protocol.followUp?.metrics.map((metric, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 border rounded">
                    <span className="flex-1 text-sm">{metric}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMetric(i)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-destructive">Warnings</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newWarning}
                  onChange={(e) => setNewWarning(e.target.value)}
                  placeholder="Add important warning"
                  onKeyPress={(e) => e.key === 'Enter' && addWarning()}
                />
                <Button onClick={addWarning} size="sm" variant="destructive">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-3 space-y-2">
                {protocol.warnings?.map((warning, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 border border-destructive rounded">
                    <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                    <span className="flex-1 text-sm text-destructive">{warning}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeWarning(i)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={() => setShowPreview(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          <Button onClick={handleSend} disabled={isSending || allergenConflicts.length > 0}>
            <Send className="mr-2 h-4 w-4" />
            {isSending ? 'Sending...' : 'Send Protocol'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
