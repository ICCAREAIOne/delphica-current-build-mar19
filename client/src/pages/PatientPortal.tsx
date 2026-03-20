import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
// Toast notifications would be added via a toast library
import { trpc } from "@/lib/trpc";
import { 
  Activity, 
  FileText, 
  MessageSquare, 
  TrendingUp, 
  AlertCircle,
  CheckCircle2,
  Clock,
  Heart,
  Upload,
  Send,
  Loader2
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Streamdown } from "streamdown";
import UnstructuredLabUpload from "@/components/UnstructuredLabUpload";
import BatchLabUpload from "@/components/BatchLabUpload";
import LabTrendChart from "@/components/LabTrendChart";
import BiomarkerTrendChart from "@/components/BiomarkerTrendChart";
import DelphiWhatIf from "@/components/DelphiWhatIf";

export default function PatientPortal() {
  const { user } = useAuth();
  const toast = (msg: any) => console.log(msg); // Placeholder for toast
  const [activeTab, setActiveTab] = useState("overview");
  const [checkInMessage, setCheckInMessage] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [uploadMode, setUploadMode] = useState<'single' | 'batch'>('single');

  // Fetch active care plan
  const { data: carePlan, isLoading: carePlanLoading } = trpc.patientPortal.getActiveCarePlan.useQuery(
    { patientId: user?.id || 0 },
    { enabled: !!user }
  );

  // Fetch check-ins
  const { data: checkIns, refetch: refetchCheckIns } = trpc.patientPortal.getPatientCheckIns.useQuery(
    { patientId: user?.id || 0 },
    { enabled: !!user }
  );

  // Fetch lab results
  const { data: labResults, refetch: refetchLabs } = trpc.patientPortal.getPatientLabResults.useQuery(
    { patientId: user?.id || 0 },
    { enabled: !!user }
  );

  // Fetch progress metrics
  const { data: progressMetrics } = trpc.patientPortal.getProgressMetrics.useQuery(
    { patientId: user?.id || 0 },
    { enabled: !!user }
  );

  // Note: Conversation fetching would need a getConversation endpoint
  // For now, we'll manage conversation state locally
  const [conversationMessages, setConversationMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);

  // Mutations
  const startCheckIn = trpc.patientPortal.startCheckIn.useMutation({
    onSuccess: (data) => {
      setActiveConversationId(data.conversationId);
      setConversationMessages([{ role: 'assistant', content: data.message }]);
      toast({ title: "Check-in started", description: "Let's talk about how you're doing" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const continueCheckIn = trpc.patientPortal.continueCheckIn.useMutation({
    onSuccess: (data) => {
      setCheckInMessage("");
      setConversationMessages(prev => [...prev, { role: 'user', content: checkInMessage }, { role: 'assistant', content: data.message }]);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const completeCheckIn = trpc.patientPortal.completeCheckIn.useMutation({
    onSuccess: () => {
      setActiveConversationId(null);
      refetchCheckIns();
      toast({ title: "Check-in complete", description: "Your progress has been recorded" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Lab upload mutation now handled by UnstructuredLabUpload component

  const handleStartCheckIn = () => {
    if (!user) return;
    startCheckIn.mutate({ patientId: user.id });
  };

  const handleSendMessage = () => {
    if (!checkInMessage.trim() || !activeConversationId) return;
    
    continueCheckIn.mutate({
      conversationId: activeConversationId,
      userMessage: checkInMessage
    });
  };

  const handleCompleteCheckIn = () => {
    if (!activeConversationId) return;
    completeCheckIn.mutate({ conversationId: activeConversationId });
  };

  // Lab upload now handled by UnstructuredLabUpload component

  if (!user) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Please log in to access your patient portal
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (carePlanLoading) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!carePlan) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>No Active Care Plan</CardTitle>
            <CardDescription>
              You don't have an active care plan yet. Please contact your physician to get started.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Health Portal</h1>
        <p className="text-muted-foreground">
          Welcome back, {user.name}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="checkin">Check-in</TabsTrigger>
          <TabsTrigger value="labs">Lab Results</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="biomarkers">Biomarkers</TabsTrigger>
          <TabsTrigger value="whatif">What-If</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500" />
                {carePlan.title}
              </CardTitle>
              <CardDescription>
                Started {new Date(carePlan.startDate).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Diagnosis</h4>
                <p className="text-sm text-muted-foreground">{carePlan.diagnosis}</p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Treatment Goals</h4>
                <ul className="space-y-1">
                  {carePlan.goals?.map((goal: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {goal}
                    </li>
                  ))}
                </ul>
              </div>

              {carePlan.medications && carePlan.medications.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Medications</h4>
                  <div className="space-y-2">
                    {carePlan.medications.map((med: any, i: number) => (
                      <div key={i} className="text-sm border-l-2 border-blue-500 pl-3 py-1">
                        <div className="font-medium">{med.name} {med.dosage}</div>
                        <div className="text-muted-foreground">{med.frequency}</div>
                        {med.instructions && (
                          <div className="text-xs text-muted-foreground mt-1">{med.instructions}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {carePlan.lifestyle && carePlan.lifestyle.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Lifestyle Recommendations</h4>
                  <div className="space-y-2">
                    {carePlan.lifestyle.map((item: any, i: number) => (
                      <div key={i} className="text-sm border-l-2 border-green-500 pl-3 py-1">
                        <div className="font-medium">{item.recommendation}</div>
                        {item.frequency && (
                          <div className="text-muted-foreground">{item.frequency}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-4 border-t">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Next check-in: {carePlan.checkInFrequency.replace('_', ' ')}
                </span>
              </div>
            </CardContent>
          </Card>

          {checkIns && checkIns.length > 0 && (
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Check-in Streak</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{checkIns.length} total</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Last: {new Date(checkIns[0].checkInDate).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Overall Feeling</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{checkIns[0]?.overallFeeling || 0}/10</div>
                  <p className="text-xs text-muted-foreground mt-1">Latest check-in</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Medication Adherence</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    95%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">This week</p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Check-in Tab */}
        <TabsContent value="checkin" className="space-y-6">
          {activeConversationId ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                  Active Check-in
                </CardTitle>
                <CardDescription>
                  Tell me how you're doing today
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4 max-h-96 overflow-y-auto border rounded-lg p-4">
                  {conversationMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.role === 'user'
                            ? 'bg-blue-500 text-white'
                            : 'bg-muted'
                        }`}
                      >
                        <Streamdown>{msg.content}</Streamdown>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input
                    value={checkInMessage}
                    onChange={(e) => setCheckInMessage(e.target.value)}
                    placeholder="Type your message..."
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled={continueCheckIn.isPending}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!checkInMessage.trim() || continueCheckIn.isPending}
                  >
                    {continueCheckIn.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <Button
                  onClick={handleCompleteCheckIn}
                  variant="outline"
                  className="w-full"
                  disabled={completeCheckIn.isPending}
                >
                  {completeCheckIn.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Complete Check-in
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                  AI Health Check-in
                </CardTitle>
                <CardDescription>
                  Start a conversation about your health
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">What to expect:</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• I'll ask about your symptoms and how you're feeling</li>
                    <li>• We'll discuss your medications and any side effects</li>
                    <li>• I'll check on your lifestyle goals and progress</li>
                    <li>• If I notice any concerns, I'll alert your physician</li>
                  </ul>
                </div>

                {checkIns && checkIns.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Recent Check-ins</h4>
                    {checkIns.slice(0, 3).map((checkIn: any) => (
                      <div key={checkIn.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {new Date(checkIn.checkInDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {checkIn.alertGenerated ? (
                              <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Alert
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Normal
                              </Badge>
                            )}
                            <span className="text-sm font-semibold">
                              {checkIn.overallFeeling}/10
                            </span>
                          </div>
                        </div>
                        {checkIn.summary && (
                          <p className="text-sm text-muted-foreground">{checkIn.summary}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  onClick={handleStartCheckIn}
                  className="w-full"
                  size="lg"
                  disabled={startCheckIn.isPending}
                >
                  {startCheckIn.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <MessageSquare className="h-4 w-4 mr-2" />
                  )}
                  Start New Check-in
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Lab Results Tab */}
        <TabsContent value="labs" className="space-y-6">
          {/* Upload Mode Toggle */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={uploadMode === 'single' ? 'default' : 'outline'}
              onClick={() => setUploadMode('single')}
            >
              Single Upload
            </Button>
            <Button
              variant={uploadMode === 'batch' ? 'default' : 'outline'}
              onClick={() => setUploadMode('batch')}
            >
              Batch Upload
            </Button>
          </div>

          {/* Upload Component */}
          {uploadMode === 'single' ? (
            <UnstructuredLabUpload
              patientId={user?.id || 0}
              onSuccess={() => {
                refetchLabs();
                toast({ title: "Success", description: "Lab results uploaded and parsed successfully!" });
              }}
            />
          ) : (
            <BatchLabUpload
              patientId={user?.id || 0}
              onSuccess={() => {
                refetchLabs();
                toast({ title: "Success", description: "All lab results uploaded and parsed successfully!" });
              }}
            />
          )}

          {/* Recent Lab Results */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Lab Results</CardTitle>
            </CardHeader>
            <CardContent>
              {labResults && labResults.length > 0 ? (
                <div className="space-y-3">
                  {labResults.map((lab: any) => (
                    <div key={lab.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium">{lab.testName}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(lab.testDate).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold">
                            {lab.value} {lab.unit}
                          </div>
                          {lab.status && (
                            <Badge
                              variant="outline"
                              className={
                                lab.status === 'normal'
                                  ? 'text-green-600 border-green-600'
                                  : lab.status === 'high'
                                  ? 'text-orange-600 border-orange-600'
                                  : 'text-red-600 border-red-600'
                              }
                            >
                              {lab.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {lab.interpretation && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {lab.interpretation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No lab results yet. Upload your first lab report above.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Your Progress
              </CardTitle>
              <CardDescription>
                Track your health journey over time
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {progressMetrics && progressMetrics.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3">Overall Feeling Trend</h4>
                      <div className="space-y-2">
                        {progressMetrics.slice(0, 7).reverse().map((metric, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-20">
                              {new Date(metric.periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                            <div className="flex-1 bg-muted rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${((metric.avgOverallFeeling || 0) / 10) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-8">{metric.avgOverallFeeling || 0}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3">Medication Adherence</h4>
                      <div className="space-y-2">
                        {progressMetrics.slice(0, 7).reverse().map((metric, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-20">
                              {new Date(metric.periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                            <div className="flex-1 bg-muted rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full"
                                style={{ width: `${metric.medicationAdherence}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-12">{metric.medicationAdherence}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-muted p-8 rounded-lg text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Complete more check-ins to see your progress trends
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lab Trends Section */}
          {labResults && labResults.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Lab Result Trends</h3>
              {/* Get unique test names */}
              {Array.from(new Set(
                labResults.flatMap((lab: any) => 
                  (Array.isArray(lab.testResults) ? lab.testResults : JSON.parse(lab.testResults as any))
                    .map((test: any) => test.testName)
                )
              )).slice(0, 5).map((testName: string) => (
                <LabTrendChart
                  key={testName}
                  labResults={labResults}
                  testName={testName}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Biomarker Trends Tab */}
        <TabsContent value="biomarkers" className="space-y-6">
          <BiomarkerTrendChart patientId={user?.id || 0} />
        </TabsContent>

        {/* What-If Scenarios Tab */}
        <TabsContent value="whatif" className="space-y-6">
          <DelphiWhatIf patientId={user?.id || 0} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
