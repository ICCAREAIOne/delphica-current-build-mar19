import { useState, useMemo, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Brain, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  ExternalLink, 
  AlertCircle,
  Sparkles,
  TrendingUp,
  Clock,
  Pill,
  BookOpen,
  FlaskConical,
  ShieldCheck,
  X
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface TreatmentRecommendationsProps {
  sessionId: number;
  /** Primary ICD-10 diagnosis code — used to fetch persisted Bayesian confidence scores */
  diagnosisCode?: string;
  onRecommendationAccepted?: () => void;
}

export function TreatmentRecommendations({ sessionId, diagnosisCode, onRecommendationAccepted }: TreatmentRecommendationsProps) {
  const { toast } = useToast();
  const [selectedRecommendation, setSelectedRecommendation] = useState<any | null>(null);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedbackAction, setFeedbackAction] = useState<'accepted' | 'rejected' | 'modified'>('accepted');
  const [feedback, setFeedback] = useState('');
  const [bestTreatmentId, setBestTreatmentId] = useState<number | null>(null);
  const [thompsonLoading, setThompsonLoading] = useState(false);

  // Fetch recommendations
  const { data: recommendations, isLoading, refetch } = trpc.causalBrain.getRecommendations.useQuery({ sessionId });

  // Fetch persisted Bayesian confidence scores from treatment_policy table
  const { data: policies } = trpc.causalBrain.getPoliciesForDiagnosis.useQuery(
    { diagnosisCode: diagnosisCode ?? '' },
    { enabled: !!diagnosisCode }
  );

  // Build a lookup map: treatmentCode -> policy data
  const policyMap = useMemo(() => {
    if (!policies) return new Map();
    return new Map(policies.map((p: any) => [p.treatmentCode, p]));
  }, [policies]);

  // Generate recommendations mutation
  const generateRecommendations = trpc.causalBrain.generateRecommendations.useMutation({
    onSuccess: () => {
      toast({ 
        title: 'Recommendations generated', 
        description: 'AI-powered treatment recommendations are ready for review' 
      });
      refetch();
    },
    onError: (error) => {
      toast({ 
        title: 'Error generating recommendations', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  // Update recommendation status mutation
  const updateStatus = trpc.causalBrain.updateRecommendationStatus.useMutation({
    onSuccess: () => {
      toast({ title: 'Recommendation status updated' });
      refetch();
      setShowFeedbackDialog(false);
      setSelectedRecommendation(null);
      setFeedback('');
      if (feedbackAction === 'accepted' && onRecommendationAccepted) {
        onRecommendationAccepted();
      }
    },
    onError: (error) => {
      toast({ title: 'Error updating status', description: error.message, variant: 'destructive' });
    },
  });

  // Thompson Sampling — select best treatment arm
  const selectBestTreatmentMutation = trpc.causalBrain.selectBestTreatment.useMutation({
    onSuccess: (result: any) => {
      if (result?.bestTreatment) {
        const winner = recommendations?.find(
          (r: any) => r.treatmentName === result.bestTreatment.treatmentName
        );
        if (winner) {
          setBestTreatmentId(winner.id);
          toast({
            title: '🏆 Best Treatment Selected',
            description: `Thompson Sampling recommends: ${result.bestTreatment.treatmentName} (θ=${result.bestTreatment.sampledTheta?.toFixed(3) ?? 'N/A'})`,
          });
        } else {
          toast({
            title: '🏆 Best Treatment Selected',
            description: `Thompson Sampling recommends: ${result.bestTreatment.treatmentName}`,
          });
        }
      }
      setThompsonLoading(false);
    },
    onError: (error: any) => {
      toast({ title: 'Thompson Sampling error', description: error.message, variant: 'destructive' });
      setThompsonLoading(false);
    },
  });

  const handleSelectBestTreatment = useCallback(() => {
    if (!recommendations || recommendations.length === 0 || !diagnosisCode) return;
    setThompsonLoading(true);
    setBestTreatmentId(null);
    selectBestTreatmentMutation.mutate({
      diagnosisCode: diagnosisCode,
      candidates: recommendations.map((r: any) => ({
        treatmentCode: r.treatmentType ?? r.treatmentName,
        treatmentName: r.treatmentName,
      })),
    });
  }, [recommendations, diagnosisCode, selectBestTreatmentMutation]);

  const handleGenerateRecommendations = () => {
    generateRecommendations.mutate({ sessionId });
  };

  const handleOpenFeedback = (recommendation: any, action: 'accepted' | 'rejected' | 'modified') => {
    setSelectedRecommendation(recommendation);
    setFeedbackAction(action);
    setShowFeedbackDialog(true);
  };

  const handleSubmitFeedback = () => {
    if (!selectedRecommendation) return;
    
    updateStatus.mutate({
      recommendationId: selectedRecommendation.id,
      status: feedbackAction,
      feedback: feedback || undefined,
    });
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getConfidenceBadge = (score: number) => {
    if (score >= 0.8) return <Badge className="bg-green-100 text-green-800">High Confidence</Badge>;
    if (score >= 0.6) return <Badge className="bg-yellow-100 text-yellow-800">Medium Confidence</Badge>;
    return <Badge className="bg-orange-100 text-orange-800">Low Confidence</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-cyan-600" />
            AI Treatment Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-cyan-600" />
            AI Treatment Recommendations
          </CardTitle>
          <CardDescription>
            Generate evidence-based treatment recommendations powered by Causal Brain AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Sparkles className="h-12 w-12 text-cyan-600 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              No recommendations generated yet. Click below to analyze the clinical session and generate AI-powered treatment suggestions.
            </p>
            <Button 
              onClick={handleGenerateRecommendations}
              disabled={generateRecommendations.isPending}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {generateRecommendations.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Generate Recommendations
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-cyan-600" />
                AI Treatment Recommendations
              </CardTitle>
              <CardDescription>
                Evidence-based suggestions from Causal Brain analysis
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {diagnosisCode && (
                <Button
                  onClick={handleSelectBestTreatment}
                  disabled={thompsonLoading || !recommendations || recommendations.length === 0}
                  variant="outline"
                  size="sm"
                  className="border-amber-400 text-amber-700 hover:bg-amber-50"
                >
                  {thompsonLoading ? (
                    <><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-amber-600 mr-2" />Sampling...</>
                  ) : (
                    <><Sparkles className="h-3.5 w-3.5 mr-1.5" />Best Treatment</>
                  )}
                </Button>
              )}
              <Button 
                onClick={handleGenerateRecommendations}
                disabled={generateRecommendations.isPending}
                variant="outline"
                size="sm"
              >
                {generateRecommendations.isPending ? 'Regenerating...' : 'Regenerate'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {recommendations.map((rec: any, index: number) => (
            <Card key={rec.id} className={`border-2 ${bestTreatmentId === rec.id ? 'border-amber-400 ring-2 ring-amber-200' : 'border-cyan-100'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                      {getConfidenceBadge(parseFloat(rec.confidenceScore))}
                      <Badge variant="outline" className="text-xs">
                        {rec.treatmentType}
                      </Badge>
                      {bestTreatmentId === rec.id && (
                        <Badge className="bg-amber-500 text-white text-xs flex items-center gap-1 pr-1">
                          <Sparkles className="h-3 w-3" />
                          AI Recommended
                          <button
                            onClick={(e) => { e.stopPropagation(); setBestTreatmentId(null); }}
                            className="ml-1 rounded-full hover:bg-amber-600 p-0.5 transition-colors"
                            title="Clear selection"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg">{rec.treatmentName}</CardTitle>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getConfidenceColor(parseFloat(rec.confidenceScore))}`}>
                      {(parseFloat(rec.confidenceScore) * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-muted-foreground">AI estimate</div>
                    {/* Real-world Bayesian confidence overlay */}
                    {(() => {
                      const policy = policyMap.get(rec.treatmentCode ?? rec.treatmentName);
                      if (!policy) return null;
                      const rwConf = (policy.confidenceScore * 100).toFixed(0);
                      const nObs = policy.totalObservations;
                      const isHigher = policy.confidenceScore > parseFloat(rec.confidenceScore);
                      return (
                        <div className="mt-1 text-right">
                          <div className={`text-sm font-semibold ${isHigher ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {rwConf}% real-world
                          </div>
                          <div className="text-xs text-muted-foreground">
                            n={nObs} outcomes · Beta({Number(policy.alpha).toFixed(1)},{Number(policy.beta).toFixed(1)})
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Reasoning */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-cyan-600" />
                    Clinical Reasoning
                  </h4>
                  <p className="text-sm text-muted-foreground">{rec.reasoning}</p>
                </div>

                {/* Dosage Information */}
                {(rec.suggestedDosage || rec.suggestedFrequency || rec.suggestedDuration) && (
                  <div className="bg-cyan-50 p-3 rounded-lg">
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Pill className="h-4 w-4 text-cyan-600" />
                      Dosage & Administration
                    </h4>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      {rec.suggestedDosage && (
                        <div>
                          <span className="text-muted-foreground">Dosage:</span>
                          <p className="font-medium">{rec.suggestedDosage}</p>
                        </div>
                      )}
                      {rec.suggestedFrequency && (
                        <div>
                          <span className="text-muted-foreground">Frequency:</span>
                          <p className="font-medium">{rec.suggestedFrequency}</p>
                        </div>
                      )}
                      {rec.suggestedDuration && (
                        <div>
                          <span className="text-muted-foreground">Duration:</span>
                          <p className="font-medium">{rec.suggestedDuration}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Expected Outcome */}
                {rec.expectedOutcome && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-cyan-600" />
                      Expected Outcome
                    </h4>
                    <p className="text-sm text-muted-foreground">{rec.expectedOutcome}</p>
                  </div>
                )}

                {/* Contraindications */}
                {rec.contraindications && rec.contraindications.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      Contraindications
                    </h4>
                    <ul className="text-sm text-red-600 space-y-1">
                      {rec.contraindications.map((contra: string, i: number) => (
                        <li key={i}>• {contra}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Evidence Sources */}
                {rec.evidenceSources && rec.evidenceSources.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-cyan-600" />
                      Evidence Sources
                    </h4>
                    <ul className="text-sm space-y-2">
                      {rec.evidenceSources.map((source: any, i: number) => {
                        // Handle both legacy string format and new EvidenceSource object format
                        if (typeof source === 'string') {
                          return (
                            <li key={i} className="flex items-start gap-2">
                              <Badge className="mt-0.5 shrink-0 bg-yellow-100 text-yellow-800 border-yellow-300 text-xs">
                                <FlaskConical className="h-3 w-3 mr-1" />
                                Simulated
                              </Badge>
                              <span className="text-muted-foreground">{source}</span>
                            </li>
                          );
                        }
                        const isVerified = source.isVerified === true;
                        return (
                          <li key={i} className={`rounded-lg p-2 border ${
                            isVerified ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                          }`}>
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <span className="text-sm font-medium text-foreground leading-snug">
                                {source.title}
                              </span>
                              {isVerified ? (
                                <Badge className="shrink-0 bg-green-100 text-green-800 border-green-300 text-xs">
                                  <ShieldCheck className="h-3 w-3 mr-1" />
                                  PubMed Verified
                                </Badge>
                              ) : (
                                <Badge className="shrink-0 bg-yellow-100 text-yellow-800 border-yellow-300 text-xs">
                                  <FlaskConical className="h-3 w-3 mr-1" />
                                  Simulated
                                </Badge>
                              )}
                            </div>
                            {source.authors && (
                              <p className="text-xs text-muted-foreground">{source.authors}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {source.journal && (
                                <span className="text-xs text-muted-foreground italic">{source.journal}</span>
                              )}
                              {source.publicationDate && (
                                <span className="text-xs text-muted-foreground">({source.publicationDate})</span>
                              )}
                              {source.studyType && (
                                <Badge variant="outline" className="text-xs py-0">{source.studyType.replace(/_/g, ' ')}</Badge>
                              )}
                              {source.evidenceGrade && (
                                <Badge variant="outline" className={`text-xs py-0 ${
                                  source.evidenceGrade === 'A' ? 'border-green-400 text-green-700' :
                                  source.evidenceGrade === 'B' ? 'border-blue-400 text-blue-700' :
                                  source.evidenceGrade === 'C' ? 'border-yellow-400 text-yellow-700' :
                                  'border-gray-400 text-gray-600'
                                }`}>Grade {source.evidenceGrade}</Badge>
                              )}
                            </div>
                            {source.keyFindings && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{source.keyFindings}</p>
                            )}
                            {isVerified && source.pmid && (
                              <a
                                href={`https://pubmed.ncbi.nlm.nih.gov/${source.pmid}/`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-cyan-600 hover:underline mt-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                PMID {source.pmid}
                              </a>
                            )}
                            {isVerified && source.doi && !source.pmid && (
                              <a
                                href={`https://doi.org/${source.doi}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-cyan-600 hover:underline mt-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                DOI: {source.doi}
                              </a>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* Alternative Treatments */}
                {rec.alternativeTreatments && rec.alternativeTreatments.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Alternative Options</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {rec.alternativeTreatments.map((alt: string, i: number) => (
                        <li key={i}>• {alt}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2 border-t">
                  {rec.status === 'pending' ? (
                    <>
                      <Button
                        onClick={() => handleOpenFeedback(rec, 'accepted')}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Accept
                      </Button>
                      <Button
                        onClick={() => handleOpenFeedback(rec, 'modified')}
                        variant="outline"
                        className="flex-1"
                        size="sm"
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Modify
                      </Button>
                      <Button
                        onClick={() => handleOpenFeedback(rec, 'rejected')}
                        variant="outline"
                        className="flex-1 text-red-600 hover:text-red-700"
                        size="sm"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </>
                  ) : (
                    <Badge 
                      className={
                        rec.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        rec.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }
                    >
                      {rec.status.charAt(0).toUpperCase() + rec.status.slice(1)}
                    </Badge>
                  )}
                </div>

                {/* Physician Feedback */}
                {rec.physicianFeedback && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h4 className="text-sm font-semibold mb-1">Physician Notes</h4>
                    <p className="text-sm text-muted-foreground">{rec.physicianFeedback}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Feedback Dialog */}
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {feedbackAction === 'accepted' && 'Accept Recommendation'}
              {feedbackAction === 'rejected' && 'Reject Recommendation'}
              {feedbackAction === 'modified' && 'Modify Recommendation'}
            </DialogTitle>
            <DialogDescription>
              {selectedRecommendation?.treatmentName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="feedback">
                {feedbackAction === 'accepted' && 'Additional notes (optional)'}
                {feedbackAction === 'rejected' && 'Reason for rejection'}
                {feedbackAction === 'modified' && 'Describe modifications'}
              </Label>
              <Textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder={
                  feedbackAction === 'accepted' ? 'Any additional clinical notes...' :
                  feedbackAction === 'rejected' ? 'Why is this recommendation not suitable?' :
                  'What modifications are needed?'
                }
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFeedbackDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitFeedback}
              disabled={updateStatus.isPending}
              className={
                feedbackAction === 'accepted' ? 'bg-green-600 hover:bg-green-700' :
                feedbackAction === 'rejected' ? 'bg-red-600 hover:bg-red-700' :
                'bg-blue-600 hover:bg-blue-700'
              }
            >
              {updateStatus.isPending ? 'Saving...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
