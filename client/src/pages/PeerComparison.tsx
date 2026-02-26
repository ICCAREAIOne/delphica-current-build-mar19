import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Users, Award, BarChart3 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export function PeerComparison() {
  const { data: comparison, isLoading } = trpc.delphiSimulator.getPeerComparison.useQuery();
  const { data: distribution } = trpc.delphiSimulator.getFeedbackDistribution.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!comparison) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-muted-foreground">No peer comparison data available</p>
        </CardContent>
      </Card>
    );
  }

  const getPercentileColor = (percentile: number) => {
    if (percentile >= 75) return 'text-green-600';
    if (percentile >= 50) return 'text-blue-600';
    if (percentile >= 25) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPercentileBadge = (percentile: number) => {
    if (percentile >= 75) return 'bg-green-100 text-green-800 border-green-300';
    if (percentile >= 50) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (percentile >= 25) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Peer Comparison</h1>
        <p className="text-muted-foreground mt-2">
          Compare your feedback patterns with {comparison.peers.totalPeerCount} colleagues
        </p>
      </div>

      {/* Overall Quality Score */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Overall Quality Score</CardTitle>
              <CardDescription>Your feedback quality compared to peers</CardDescription>
            </div>
            <Award className="h-8 w-8 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Interaction Quality</span>
                <Badge className={getPercentileBadge(comparison.percentiles.interaction)}>
                  {comparison.percentiles.interaction}th percentile
                </Badge>
              </div>
              <div className="text-3xl font-bold">
                {comparison.qualityScore.interaction.toFixed(2)}
              </div>
              <Progress value={comparison.qualityScore.interaction * 20} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Peer average: {(
                  (comparison.peers.interactionStats.avgRealismScore +
                    comparison.peers.interactionStats.avgClinicalAccuracy +
                    comparison.peers.interactionStats.avgConversationalQuality) / 3
                ).toFixed(2)}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Outcome Quality</span>
                <Badge className={getPercentileBadge(comparison.percentiles.outcome)}>
                  {comparison.percentiles.outcome}th percentile
                </Badge>
              </div>
              <div className="text-3xl font-bold">
                {comparison.qualityScore.outcome.toFixed(2)}
              </div>
              <Progress value={comparison.qualityScore.outcome * 20} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Peer average: {(
                  (comparison.peers.outcomeStats.avgAccuracyScore +
                    comparison.peers.outcomeStats.avgEvidenceQuality +
                    comparison.peers.outcomeStats.avgClinicalRelevance) / 3
                ).toFixed(2)}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall</span>
                <Badge className={getPercentileBadge(comparison.percentiles.overall)}>
                  {comparison.percentiles.overall}th percentile
                </Badge>
              </div>
              <div className="text-3xl font-bold">
                {comparison.qualityScore.overall.toFixed(2)}
              </div>
              <Progress value={comparison.qualityScore.overall * 20} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Top {100 - comparison.percentiles.overall}% of physicians
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interaction Feedback Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Virtual Patient Interaction Ratings</CardTitle>
          <CardDescription>How you rate virtual patient realism vs. peers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Realism Score</span>
                <span className="text-muted-foreground">
                  You: {comparison.physician.interactionStats.avgRealismScore.toFixed(2)} | 
                  Peers: {comparison.peers.interactionStats.avgRealismScore.toFixed(2)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Your Rating</p>
                  <Progress 
                    value={comparison.physician.interactionStats.avgRealismScore * 20} 
                    className="h-3"
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Peer Average</p>
                  <Progress 
                    value={comparison.peers.interactionStats.avgRealismScore * 20} 
                    className="h-3 [&>div]:bg-muted-foreground"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Clinical Accuracy</span>
                <span className="text-muted-foreground">
                  You: {comparison.physician.interactionStats.avgClinicalAccuracy.toFixed(2)} | 
                  Peers: {comparison.peers.interactionStats.avgClinicalAccuracy.toFixed(2)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Your Rating</p>
                  <Progress 
                    value={comparison.physician.interactionStats.avgClinicalAccuracy * 20} 
                    className="h-3"
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Peer Average</p>
                  <Progress 
                    value={comparison.peers.interactionStats.avgClinicalAccuracy * 20} 
                    className="h-3 [&>div]:bg-muted-foreground"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Conversational Quality</span>
                <span className="text-muted-foreground">
                  You: {comparison.physician.interactionStats.avgConversationalQuality.toFixed(2)} | 
                  Peers: {comparison.peers.interactionStats.avgConversationalQuality.toFixed(2)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Your Rating</p>
                  <Progress 
                    value={comparison.physician.interactionStats.avgConversationalQuality * 20} 
                    className="h-3"
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Peer Average</p>
                  <Progress 
                    value={comparison.peers.interactionStats.avgConversationalQuality * 20} 
                    className="h-3 [&>div]:bg-muted-foreground"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Outcome Prediction Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Outcome Prediction Ratings</CardTitle>
          <CardDescription>How you rate prediction accuracy vs. peers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Accuracy Score</span>
                <span className="text-muted-foreground">
                  You: {comparison.physician.outcomeStats.avgAccuracyScore.toFixed(2)} | 
                  Peers: {comparison.peers.outcomeStats.avgAccuracyScore.toFixed(2)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Your Rating</p>
                  <Progress 
                    value={comparison.physician.outcomeStats.avgAccuracyScore * 20} 
                    className="h-3"
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Peer Average</p>
                  <Progress 
                    value={comparison.peers.outcomeStats.avgAccuracyScore * 20} 
                    className="h-3 [&>div]:bg-muted-foreground"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Evidence Quality</span>
                <span className="text-muted-foreground">
                  You: {comparison.physician.outcomeStats.avgEvidenceQuality.toFixed(2)} | 
                  Peers: {comparison.peers.outcomeStats.avgEvidenceQuality.toFixed(2)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Your Rating</p>
                  <Progress 
                    value={comparison.physician.outcomeStats.avgEvidenceQuality * 20} 
                    className="h-3"
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Peer Average</p>
                  <Progress 
                    value={comparison.peers.outcomeStats.avgEvidenceQuality * 20} 
                    className="h-3 [&>div]:bg-muted-foreground"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Clinical Relevance</span>
                <span className="text-muted-foreground">
                  You: {comparison.physician.outcomeStats.avgClinicalRelevance.toFixed(2)} | 
                  Peers: {comparison.peers.outcomeStats.avgClinicalRelevance.toFixed(2)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Your Rating</p>
                  <Progress 
                    value={comparison.physician.outcomeStats.avgClinicalRelevance * 20} 
                    className="h-3"
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Peer Average</p>
                  <Progress 
                    value={comparison.peers.outcomeStats.avgClinicalRelevance * 20} 
                    className="h-3 [&>div]:bg-muted-foreground"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback Volume */}
      <Card>
        <CardHeader>
          <CardTitle>Feedback Contribution</CardTitle>
          <CardDescription>Your participation in the feedback system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <span className="font-medium">Interaction Feedback</span>
              </div>
              <div className="text-2xl font-bold">
                {comparison.physician.interactionStats.count}
              </div>
              <p className="text-sm text-muted-foreground">
                Peer average: {Math.round(comparison.peers.interactionStats.count / Math.max(comparison.peers.totalPeerCount, 1))} submissions
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="font-medium">Outcome Feedback</span>
              </div>
              <div className="text-2xl font-bold">
                {comparison.physician.outcomeStats.count}
              </div>
              <p className="text-sm text-muted-foreground">
                Peer average: {Math.round(comparison.peers.outcomeStats.count / Math.max(comparison.peers.totalPeerCount, 1))} submissions
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Distribution Charts */}
      {distribution && (
        <Card>
          <CardHeader>
            <CardTitle>Rating Distribution</CardTitle>
            <CardDescription>How all physicians rate the system (1-5 stars)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h4 className="font-medium mb-3">Virtual Patient Realism</h4>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((star) => (
                    <div key={star} className="flex items-center gap-3">
                      <span className="text-sm w-12">{star} stars</span>
                      <Progress 
                        value={(distribution.interaction.realism[star - 1] / Math.max(...distribution.interaction.realism, 1)) * 100}
                        className="h-2 flex-1"
                      />
                      <span className="text-sm text-muted-foreground w-12 text-right">
                        {distribution.interaction.realism[star - 1]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Outcome Prediction Accuracy</h4>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((star) => (
                    <div key={star} className="flex items-center gap-3">
                      <span className="text-sm w-12">{star} stars</span>
                      <Progress 
                        value={(distribution.outcome.accuracy[star - 1] / Math.max(...distribution.outcome.accuracy, 1)) * 100}
                        className="h-2 flex-1"
                      />
                      <span className="text-sm text-muted-foreground w-12 text-right">
                        {distribution.outcome.accuracy[star - 1]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
