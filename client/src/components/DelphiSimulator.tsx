import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, MessageSquare, TrendingUp, CheckCircle2, AlertCircle, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';
import { FeedbackRating } from './FeedbackRating';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DelphiSimulatorProps {
  sessionId: number;
  patientId: number;
  diagnosisCode: string;
  diagnosisName: string;
  onClose: () => void;
}

export function DelphiSimulator({ sessionId, patientId, diagnosisCode, diagnosisName, onClose }: DelphiSimulatorProps) {
  const [selectedScenarioId, setSelectedScenarioId] = useState<number | null>(null);
  const [physicianMessage, setPhysicianMessage] = useState('');
  const [currentDay, setCurrentDay] = useState(1);
  const [activeTab, setActiveTab] = useState<'scenarios' | 'conversation' | 'outcomes' | 'comparison'>('scenarios');
  
  // Feedback state
  const [showInteractionFeedback, setShowInteractionFeedback] = useState(false);
  const [showOutcomeFeedback, setShowOutcomeFeedback] = useState(false);
  const [selectedInteractionId, setSelectedInteractionId] = useState<number | null>(null);
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<number | null>(null);
  const [interactionFeedback, setInteractionFeedback] = useState({
    realismScore: 0,
    clinicalAccuracy: 0,
    conversationalQuality: 0,
    comments: '',
    issuesReported: [] as string[],
  });
  const [outcomeFeedback, setOutcomeFeedback] = useState({
    accuracyScore: 0,
    evidenceQuality: 0,
    clinicalRelevance: 0,
    actualOutcomeOccurred: '' as 'yes' | 'no' | 'partially' | 'unknown' | '',
    actualProbability: '',
    actualSeverity: '' as 'mild' | 'moderate' | 'severe' | 'critical' | '',
    comments: '',
    suggestedImprovements: '',
  });

  // Generate scenarios
  const generateScenarios = trpc.delphiSimulator.generateScenarios.useMutation({
    onSuccess: (data) => {
      toast.success(`Generated ${data.scenarioIds.length} treatment scenarios`);
      refetchScenarios();
    },
    onError: (error) => {
      toast.error(`Failed to generate scenarios: ${error.message}`);
    },
  });

  // Get scenarios
  const { data: scenarios, refetch: refetchScenarios } = trpc.delphiSimulator.getScenarios.useQuery(
    { sessionId },
    { enabled: true }
  );

  // Simulate patient response
  const simulateResponse = trpc.delphiSimulator.simulatePatientResponse.useMutation({
    onSuccess: () => {
      setPhysicianMessage('');
      refetchConversation();
      toast.success('Patient responded');
    },
    onError: (error) => {
      toast.error(`Failed to simulate response: ${error.message}`);
    },
  });

  // Get conversation
  const { data: conversation, refetch: refetchConversation } = trpc.delphiSimulator.getConversation.useQuery(
    { scenarioId: selectedScenarioId! },
    { enabled: !!selectedScenarioId }
  );

  // Predict outcomes
  const predictOutcomes = trpc.delphiSimulator.predictOutcomes.useMutation({
    onSuccess: () => {
      toast.success('Outcomes predicted');
      refetchOutcomes();
    },
    onError: (error) => {
      toast.error(`Failed to predict outcomes: ${error.message}`);
    },
  });

  // Get outcomes
  const { data: outcomes, refetch: refetchOutcomes } = trpc.delphiSimulator.getOutcomes.useQuery(
    { scenarioId: selectedScenarioId! },
    { enabled: !!selectedScenarioId }
  );

  // Compare scenarios
  const compareScenarios = trpc.delphiSimulator.compareScenarios.useMutation({
    onSuccess: () => {
      toast.success('Scenarios compared');
      refetchComparisons();
      setActiveTab('comparison');
    },
    onError: (error) => {
      toast.error(`Failed to compare scenarios: ${error.message}`);
    },
  });

  // Get comparisons
  const { data: comparisons, refetch: refetchComparisons } = trpc.delphiSimulator.getComparisons.useQuery(
    { sessionId },
    { enabled: true }
  );

  // Select scenario
  const selectScenario = trpc.delphiSimulator.selectScenario.useMutation({
    onSuccess: () => {
      toast.success('Scenario selected as treatment plan');
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to select scenario: ${error.message}`);
    },
  });

  // Submit interaction feedback
  const submitInteractionFeedback = trpc.delphiSimulator.submitInteractionFeedback.useMutation({
    onSuccess: () => {
      toast.success('Feedback submitted successfully');
      setShowInteractionFeedback(false);
      setInteractionFeedback({
        realismScore: 0,
        clinicalAccuracy: 0,
        conversationalQuality: 0,
        comments: '',
        issuesReported: [],
      });
    },
    onError: (error) => {
      toast.error(`Failed to submit feedback: ${error.message}`);
    },
  });

  // Submit outcome feedback
  const submitOutcomeFeedback = trpc.delphiSimulator.submitOutcomeFeedback.useMutation({
    onSuccess: () => {
      toast.success('Feedback submitted successfully');
      setShowOutcomeFeedback(false);
      setOutcomeFeedback({
        accuracyScore: 0,
        evidenceQuality: 0,
        clinicalRelevance: 0,
        actualOutcomeOccurred: '',
        actualProbability: '',
        actualSeverity: '',
        comments: '',
        suggestedImprovements: '',
      });
    },
    onError: (error) => {
      toast.error(`Failed to submit feedback: ${error.message}`);
    },
  });

  // ─── Delphi → Care Plan handoff ──────────────────────────────────────────
  const [generatingCarePlan, setGeneratingCarePlan] = useState(false);
  const [carePlanId, setCarePlanId] = useState<number | null>(null);

  const generateCarePlan = trpc.ai.generateCarePlan.useMutation({
    onSuccess: (data: { id: number }) => {
      setCarePlanId(data.id);
      setGeneratingCarePlan(false);
      toast.success('Care plan generated — review it in the Care Plans section.');
    },
    onError: (error: { message: string }) => {
      setGeneratingCarePlan(false);
      toast.error(`Failed to generate care plan: ${error.message}`);
    },
  });

  const handleGenerateCarePlan = (selectedScenarioId: number, comparisonId: number) => {
    const scenario = scenarios?.find((s) => s.id === selectedScenarioId);
    if (!scenario) return;
    setGeneratingCarePlan(true);
    generateCarePlan.mutate({
      patientId,
      delphiSimulationId: comparisonId,
      diagnosis: diagnosisCode,
      treatmentGoals: [scenario.simulationGoal || `Optimise ${diagnosisCode} management`],
      selectedTreatmentOption: scenario.treatmentCode || scenario.scenarioName,
    });
  };
  // ─── End Care Plan handoff ──────────────────────────────────────────────────

  // ─── Multi-iteration Delphi refinement ────────────────────────────────────
  const [showRefineDialog, setShowRefineDialog] = useState(false);
  const [refineFeedback, setRefineFeedback] = useState('');
  const [currentIteration, setCurrentIteration] = useState(1);

  const refineScenarios = trpc.delphiSimulator.refineScenarios.useMutation({
    onSuccess: (data) => {
      if (!data.refined) {
        toast.info(data.reason);
      } else {
        setCurrentIteration(data.iteration);
        toast.success(`Iteration ${data.iteration} ready — ${data.newScenarioIds.length} refined scenarios generated.`);
        refetchScenarios();
        setSelectedScenarioId(null);
      }
      setShowRefineDialog(false);
      setRefineFeedback('');
    },
    onError: (error) => {
      toast.error(error.message);
      setShowRefineDialog(false);
    },
  });

  const handleRefineScenarios = () => {
    if (!refineFeedback.trim()) return;
    const activeScenarioIds = (scenarios || []).filter((s) => s.status !== 'archived').map((s) => s.id);
    if (activeScenarioIds.length === 0) {
      toast.error('No active scenarios to refine');
      return;
    }
    refineScenarios.mutate({
      sessionId,
      diagnosisCode,
      physicianFeedback: refineFeedback.trim(),
      currentScenarioIds: activeScenarioIds,
      forceRefine: true,
    });
  };
  // ─── End refinement ─────────────────────────────────────────────────────────

  // Auto-generate scenarios on mount if none exist
  useEffect(() => {
    if (scenarios && scenarios.length === 0 && !generateScenarios.isPending) {
      generateScenarios.mutate({ sessionId, diagnosisCode, numScenarios: 3 });
    }
  }, [scenarios]);

  const handleSendMessage = () => {
    if (!selectedScenarioId || !physicianMessage.trim()) return;
    
    simulateResponse.mutate({
      scenarioId: selectedScenarioId,
      physicianMessage: physicianMessage.trim(),
      dayInSimulation: currentDay,
    });
  };

  const handlePredictOutcomes = () => {
    if (!selectedScenarioId) return;
    predictOutcomes.mutate({ scenarioId: selectedScenarioId });
  };

  const handleCompareAll = () => {
    if (!scenarios || scenarios.length < 2) {
      toast.error('Need at least 2 scenarios to compare');
      return;
    }
    
    const scenarioIds = scenarios.map(s => s.id);
    compareScenarios.mutate({ sessionId, scenarioIds });
  };

  const handleSelectScenario = (comparisonId: number, scenarioId: number) => {
    selectScenario.mutate({
      comparisonId,
      scenarioId,
      physicianNotes: 'Selected via Delphi Simulator',
    });
  };

  const handleOpenInteractionFeedback = (interactionId: number) => {
    setSelectedInteractionId(interactionId);
    setShowInteractionFeedback(true);
  };

  const handleSubmitInteractionFeedback = () => {
    if (!selectedInteractionId || !selectedScenarioId) return;
    if (interactionFeedback.realismScore === 0 || interactionFeedback.clinicalAccuracy === 0 || interactionFeedback.conversationalQuality === 0) {
      toast.error('Please provide all ratings');
      return;
    }
    
    submitInteractionFeedback.mutate({
      interactionId: selectedInteractionId,
      scenarioId: selectedScenarioId,
      ...interactionFeedback,
    });
  };

  const handleOpenOutcomeFeedback = (outcomeId: number) => {
    setSelectedOutcomeId(outcomeId);
    setShowOutcomeFeedback(true);
  };

  const handleSubmitOutcomeFeedback = () => {
    if (!selectedOutcomeId || !selectedScenarioId) return;
    if (outcomeFeedback.accuracyScore === 0 || outcomeFeedback.evidenceQuality === 0 || outcomeFeedback.clinicalRelevance === 0) {
      toast.error('Please provide all ratings');
      return;
    }
    
    submitOutcomeFeedback.mutate({
      outcomeId: selectedOutcomeId,
      scenarioId: selectedScenarioId,
      accuracyScore: outcomeFeedback.accuracyScore,
      evidenceQuality: outcomeFeedback.evidenceQuality,
      clinicalRelevance: outcomeFeedback.clinicalRelevance,
      actualOutcomeOccurred: outcomeFeedback.actualOutcomeOccurred || undefined,
      actualProbability: outcomeFeedback.actualProbability || undefined,
      actualSeverity: outcomeFeedback.actualSeverity || undefined,
      comments: outcomeFeedback.comments || undefined,
      suggestedImprovements: outcomeFeedback.suggestedImprovements || undefined,
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'mild': return 'bg-green-100 text-green-800 border-green-300';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'severe': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Delphi Simulator</h2>
          <p className="text-sm text-muted-foreground">
            Explore treatment scenarios for: {diagnosisName} ({diagnosisCode})
          </p>
        </div>
        <div className="flex gap-2">
          {scenarios && scenarios.length >= 2 && (
            <Button
              onClick={handleCompareAll}
              disabled={compareScenarios.isPending}
              variant="outline"
            >
              {compareScenarios.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Compare All Scenarios
            </Button>
          )}
          {scenarios && scenarios.filter((s) => s.status !== 'archived').length > 0 && currentIteration < 3 && (
            <Button
              onClick={() => setShowRefineDialog(true)}
              disabled={refineScenarios.isPending}
              variant="outline"
              className="border-amber-500 text-amber-600 hover:bg-amber-50"
            >
              {refineScenarios.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Refine with Feedback
              {currentIteration > 1 && <Badge className="ml-2 bg-amber-100 text-amber-700">Iter {currentIteration}</Badge>}
            </Button>
          )}
          <Button onClick={onClose} variant="outline">Close</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          <TabsTrigger value="conversation" disabled={!selectedScenarioId}>Conversation</TabsTrigger>
          <TabsTrigger value="outcomes" disabled={!selectedScenarioId}>Outcomes</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="scenarios" className="space-y-4">
          {generateScenarios.isPending && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Generating treatment scenarios...</span>
                </div>
              </CardContent>
            </Card>
          )}

          {scenarios && scenarios.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {scenarios.map((scenario) => (
                <Card
                  key={scenario.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedScenarioId === scenario.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedScenarioId(scenario.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{scenario.scenarioName}</CardTitle>
                      <Badge variant={scenario.status === 'completed' ? 'default' : 'secondary'}>
                        {scenario.status}
                      </Badge>
                    </div>
                    <CardDescription>
                      {scenario.treatmentCode}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-3">{scenario.treatmentDescription}</p>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div>Time Horizon: {scenario.timeHorizon} days</div>
                      <div>Goal: {scenario.simulationGoal}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {scenarios && scenarios.length === 0 && !generateScenarios.isPending && (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground mb-4">No scenarios generated yet</p>
                <Button
                  onClick={() => generateScenarios.mutate({ sessionId, diagnosisCode, numScenarios: 3 })}
                >
                  Generate Scenarios
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="conversation" className="space-y-4">
          {selectedScenarioId && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Virtual Patient Conversation</CardTitle>
                  <CardDescription>
                    Day {currentDay} of treatment - Role-play with AI patient
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                      {conversation && conversation.length > 0 ? (
                        conversation.map((interaction, idx) => (
                          <div
                            key={idx}
                            className={`flex ${
                              interaction.role === 'physician' ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            <div
                              className={`max-w-[80%] rounded-lg p-3 ${
                                interaction.role === 'physician'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="text-xs font-semibold">
                                  {interaction.role === 'physician' ? 'You' : 'Patient'}
                                  {interaction.dayInSimulation && ` (Day ${interaction.dayInSimulation})`}
                                </div>
                                {interaction.role === 'patient' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2"
                                    onClick={() => handleOpenInteractionFeedback(interaction.id)}
                                  >
                                    <ThumbsUp className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                              <div className="text-sm">{interaction.message}</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-muted-foreground py-8">
                          <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>Start a conversation with the virtual patient</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  <div className="mt-4 space-y-2">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentDay(Math.max(1, currentDay - 1))}
                      >
                        Day {currentDay - 1}
                      </Button>
                      <Button size="sm" variant="outline" disabled>
                        Day {currentDay}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentDay(currentDay + 1)}
                      >
                        Day {currentDay + 1}
                      </Button>
                    </div>
                    <Textarea
                      placeholder="Ask the patient a question or describe an action..."
                      value={physicianMessage}
                      onChange={(e) => setPhysicianMessage(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSendMessage}
                        disabled={!physicianMessage.trim() || simulateResponse.isPending}
                        className="flex-1"
                      >
                        {simulateResponse.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Message
                      </Button>
                      <Button
                        onClick={handlePredictOutcomes}
                        disabled={predictOutcomes.isPending}
                        variant="outline"
                      >
                        {predictOutcomes.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Predict Outcomes
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="outcomes" className="space-y-4">
          {selectedScenarioId && (
            <>
              {outcomes && outcomes.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {outcomes.map((outcome, idx) => (
                    <Card key={idx}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base">{outcome.outcomeType}</CardTitle>
                          <Badge className={getSeverityColor(outcome.severity || 'mild')}>
                            {outcome.severity}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Probability</span>
                          <span className="font-semibold">{outcome.probability}%</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Expected Day</span>
                          <span className="font-semibold">Day {outcome.expectedDay}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Confidence</span>
                          <span className="font-semibold">{outcome.confidenceScore}%</span>
                        </div>
                        {outcome.description && (
                          <p className="text-sm text-muted-foreground border-t pt-3">
                            {outcome.description}
                          </p>
                        )}
                        {outcome.evidenceSource && (
                          <p className="text-xs text-muted-foreground">
                            Source: {outcome.evidenceSource}
                          </p>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full mt-3"
                          onClick={() => handleOpenOutcomeFeedback(outcome.id)}
                        >
                          <ThumbsUp className="h-4 w-4 mr-2" />
                          Rate Prediction
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-muted-foreground mb-4">No outcomes predicted yet</p>
                    <Button
                      onClick={handlePredictOutcomes}
                      disabled={predictOutcomes.isPending}
                    >
                      {predictOutcomes.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Predict Outcomes
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          {comparisons && comparisons.length > 0 ? (
            comparisons.map((comparison, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <CardTitle>Scenario Comparison</CardTitle>
                  <CardDescription>
                    {new Date(comparison.createdAt).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {comparison.ranking && Array.isArray(comparison.ranking) && comparison.ranking.map((rank: any, rankIdx: number) => {
                      const scenario = scenarios?.find(s => s.id === rank.scenarioId);
                      return (
                        <div
                          key={rankIdx}
                          className="border rounded-lg p-4 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">#{rankIdx + 1}</Badge>
                              <span className="font-semibold">{scenario?.scenarioName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">Score: {rank.score}/100</span>
                              {comparison.selectedScenarioId === rank.scenarioId && (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{rank.reasoning}</p>
                          {!comparison.selectedScenarioId && (
                            <Button
                              size="sm"
                              onClick={() => handleSelectScenario(comparison.id, rank.scenarioId)}
                              disabled={selectScenario.isPending}
                            >
                              Select This Scenario
                            </Button>
                          )}
                          {comparison.selectedScenarioId === rank.scenarioId && (
                            <div className="flex items-center gap-2 pt-1">
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                              <span className="text-sm text-green-700 font-medium">Selected</span>
                              {carePlanId ? (
                                <Badge className="bg-green-100 text-green-700">Care Plan #{carePlanId} created</Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white ml-2"
                                  onClick={() => handleGenerateCarePlan(rank.scenarioId, comparison.id)}
                                  disabled={generatingCarePlan || generateCarePlan.isPending}
                                >
                                  {(generatingCarePlan || generateCarePlan.isPending) && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                                  Generate Care Plan
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-muted-foreground mb-4">No comparisons yet</p>
                <Button
                  onClick={handleCompareAll}
                  disabled={!scenarios || scenarios.length < 2 || compareScenarios.isPending}
                >
                  {compareScenarios.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Compare Scenarios
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Interaction Feedback Dialog */}
      <Dialog open={showInteractionFeedback} onOpenChange={setShowInteractionFeedback}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Rate Virtual Patient Interaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <FeedbackRating
              label="Realism Score"
              value={interactionFeedback.realismScore}
              onChange={(value) => setInteractionFeedback({ ...interactionFeedback, realismScore: value })}
            />
            <FeedbackRating
              label="Clinical Accuracy"
              value={interactionFeedback.clinicalAccuracy}
              onChange={(value) => setInteractionFeedback({ ...interactionFeedback, clinicalAccuracy: value })}
            />
            <FeedbackRating
              label="Conversational Quality"
              value={interactionFeedback.conversationalQuality}
              onChange={(value) => setInteractionFeedback({ ...interactionFeedback, conversationalQuality: value })}
            />
            <div className="space-y-2">
              <Label htmlFor="interaction-comments">Comments (Optional)</Label>
              <Textarea
                id="interaction-comments"
                placeholder="Share your thoughts on this interaction..."
                value={interactionFeedback.comments}
                onChange={(e) => setInteractionFeedback({ ...interactionFeedback, comments: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInteractionFeedback(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitInteractionFeedback} disabled={submitInteractionFeedback.isPending}>
              {submitInteractionFeedback.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refine Scenarios Dialog */}
      <Dialog open={showRefineDialog} onOpenChange={setShowRefineDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Refine Scenarios with Feedback</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Describe what’s missing, incorrect, or what you’d like to explore differently.
              Causal Brain will critique the current scenarios and Delphi will generate a refined
              set (Iteration {currentIteration + 1} of 3).
            </p>
            <Textarea
              placeholder="e.g. ‘Scenarios don’t account for renal impairment. Explore lower-dose SGLT2 options and GLP-1 alternatives.’"
              value={refineFeedback}
              onChange={(e) => setRefineFeedback(e.target.value)}
              rows={5}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRefineDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRefineScenarios}
              disabled={!refineFeedback.trim() || refineScenarios.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {refineScenarios.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Run Iteration {currentIteration + 1}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Outcome Feedback Dialog */}
      <Dialog open={showOutcomeFeedback} onOpenChange={setShowOutcomeFeedback}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Rate Outcome Prediction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <FeedbackRating
              label="Accuracy Score"
              value={outcomeFeedback.accuracyScore}
              onChange={(value) => setOutcomeFeedback({ ...outcomeFeedback, accuracyScore: value })}
            />
            <FeedbackRating
              label="Evidence Quality"
              value={outcomeFeedback.evidenceQuality}
              onChange={(value) => setOutcomeFeedback({ ...outcomeFeedback, evidenceQuality: value })}
            />
            <FeedbackRating
              label="Clinical Relevance"
              value={outcomeFeedback.clinicalRelevance}
              onChange={(value) => setOutcomeFeedback({ ...outcomeFeedback, clinicalRelevance: value })}
            />
            
            <div className="border-t pt-4 space-y-4">
              <h4 className="font-medium">Actual Outcome (If Known)</h4>
              
              <div className="space-y-2">
                <Label htmlFor="actual-outcome">Did this outcome occur?</Label>
                <Select
                  value={outcomeFeedback.actualOutcomeOccurred}
                  onValueChange={(value) => setOutcomeFeedback({ ...outcomeFeedback, actualOutcomeOccurred: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="partially">Partially</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {outcomeFeedback.actualOutcomeOccurred && outcomeFeedback.actualOutcomeOccurred !== 'unknown' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="actual-severity">Actual Severity</Label>
                    <Select
                      value={outcomeFeedback.actualSeverity}
                      onValueChange={(value) => setOutcomeFeedback({ ...outcomeFeedback, actualSeverity: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mild">Mild</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="severe">Severe</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="outcome-comments">Comments (Optional)</Label>
              <Textarea
                id="outcome-comments"
                placeholder="Share your thoughts on this prediction..."
                value={outcomeFeedback.comments}
                onChange={(e) => setOutcomeFeedback({ ...outcomeFeedback, comments: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="suggested-improvements">Suggested Improvements (Optional)</Label>
              <Textarea
                id="suggested-improvements"
                placeholder="How could this prediction be improved?"
                value={outcomeFeedback.suggestedImprovements}
                onChange={(e) => setOutcomeFeedback({ ...outcomeFeedback, suggestedImprovements: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOutcomeFeedback(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitOutcomeFeedback} disabled={submitOutcomeFeedback.isPending}>
              {submitOutcomeFeedback.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
