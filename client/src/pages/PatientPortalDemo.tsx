import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, 
  FileText, 
  MessageSquare, 
  TrendingUp, 
  AlertCircle,
  CheckCircle2,
  Clock,
  Heart
} from "lucide-react";

export default function PatientPortalDemo() {
  const [activeTab, setActiveTab] = useState("overview");

  // Mock data for demo
  const mockCarePlan = {
    title: "Type 2 Diabetes Management Plan",
    diagnosis: "Type 2 Diabetes Mellitus (E11.9)",
    physician: "Dr. Sarah Chen",
    startDate: "2026-02-01",
    checkInFrequency: "weekly",
    goals: [
      "Achieve HbA1c below 7.0%",
      "Maintain fasting glucose 80-130 mg/dL",
      "Lose 10 pounds over 3 months"
    ],
    medications: [
      { name: "Metformin", dosage: "500mg", frequency: "twice daily" },
      { name: "Glipizide", dosage: "5mg", frequency: "once daily" }
    ],
    lifestyle: [
      { activity: "30 minutes walking", frequency: "daily" },
      { activity: "Low-carb diet", frequency: "daily" }
    ]
  };

  const mockCheckIns = [
    {
      date: "2026-02-20",
      overallFeeling: 8,
      summary: "Patient reports good adherence to medications. Walking daily for 35 minutes. Blood sugar levels stable.",
      alert: null
    },
    {
      date: "2026-02-13",
      overallFeeling: 7,
      summary: "Missed one dose of Metformin. Experiencing mild fatigue. Glucose readings slightly elevated.",
      alert: "low"
    },
    {
      date: "2026-02-06",
      overallFeeling: 9,
      summary: "Excellent week. All medications taken. Lost 2 pounds. Glucose readings in target range.",
      alert: null
    }
  ];

  const mockLabResults = [
    {
      date: "2026-02-15",
      testName: "HbA1c",
      value: "6.8%",
      status: "normal",
      trend: "improving"
    },
    {
      date: "2026-02-15",
      testName: "Fasting Glucose",
      value: "118 mg/dL",
      status: "normal",
      trend: "stable"
    },
    {
      date: "2026-01-15",
      testName: "HbA1c",
      value: "7.2%",
      status: "high",
      trend: null
    }
  ];

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Patient Portal Demo</h1>
        <p className="text-muted-foreground">
          Interactive demonstration of AI-powered patient care management
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="checkin">AI Check-in</TabsTrigger>
          <TabsTrigger value="labs">Lab Results</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500" />
                Active Care Plan
              </CardTitle>
              <CardDescription>Physician-sanctioned treatment plan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{mockCarePlan.title}</h3>
                <p className="text-sm text-muted-foreground">
                  Managed by {mockCarePlan.physician} • Started {mockCarePlan.startDate}
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Treatment Goals</h4>
                <ul className="space-y-1">
                  {mockCarePlan.goals.map((goal, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {goal}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Medications</h4>
                  <div className="space-y-2">
                    {mockCarePlan.medications.map((med, i) => (
                      <div key={i} className="text-sm border-l-2 border-blue-500 pl-3 py-1">
                        <div className="font-medium">{med.name} {med.dosage}</div>
                        <div className="text-muted-foreground">{med.frequency}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Lifestyle Recommendations</h4>
                  <div className="space-y-2">
                    {mockCarePlan.lifestyle.map((item, i) => (
                      <div key={i} className="text-sm border-l-2 border-green-500 pl-3 py-1">
                        <div className="font-medium">{item.activity}</div>
                        <div className="text-muted-foreground">{item.frequency}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Next check-in: {mockCarePlan.checkInFrequency}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Check-in Streak</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">3 weeks</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Last check-in: 2 days ago
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Overall Feeling</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">8/10</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Trending positive
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Medication Adherence</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">95%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Excellent compliance
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Check-in Tab */}
        <TabsContent value="checkin" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-500" />
                AI Health Assistant
              </CardTitle>
              <CardDescription>
                Dynamic, context-aware conversations about your health
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">How it works:</p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• AI asks about your symptoms, medications, and lifestyle</li>
                  <li>• Conversations adapt based on your responses</li>
                  <li>• Automatic alerts if concerns are detected</li>
                  <li>• Progress tracked and shared with your physician</li>
                  <li>• Available in 5 languages (coming soon)</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Recent Check-ins</h4>
                {mockCheckIns.map((checkIn, i) => (
                  <div key={i} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{checkIn.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {checkIn.alert ? (
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
                    <p className="text-sm text-muted-foreground">{checkIn.summary}</p>
                  </div>
                ))}
              </div>

              <Button className="w-full" size="lg">
                <MessageSquare className="h-4 w-4 mr-2" />
                Start New Check-in
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lab Results Tab */}
        <TabsContent value="labs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-500" />
                Laboratory Results
              </CardTitle>
              <CardDescription>
                Upload PDFs or enter results manually - AI extracts and analyzes data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Button variant="outline" className="h-24">
                  <div className="text-center">
                    <FileText className="h-6 w-6 mx-auto mb-2" />
                    <div className="font-medium">Upload PDF</div>
                    <div className="text-xs text-muted-foreground">
                      AI automatically extracts results
                    </div>
                  </div>
                </Button>
                <Button variant="outline" className="h-24">
                  <div className="text-center">
                    <Activity className="h-6 w-6 mx-auto mb-2" />
                    <div className="font-medium">Enter Manually</div>
                    <div className="text-xs text-muted-foreground">
                      Type in your lab values
                    </div>
                  </div>
                </Button>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Recent Results</h4>
                {mockLabResults.map((lab, i) => (
                  <div key={i} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{lab.testName}</div>
                        <div className="text-sm text-muted-foreground">{lab.date}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold">{lab.value}</div>
                        <div className="flex items-center gap-2 justify-end mt-1">
                          {lab.status === "normal" ? (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              Normal
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-orange-600 border-orange-600">
                              High
                            </Badge>
                          )}
                          {lab.trend && (
                            <Badge variant="secondary" className="text-xs">
                              {lab.trend}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Progress Tracking
              </CardTitle>
              <CardDescription>
                Visualize your health journey over time
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted p-8 rounded-lg text-center">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Interactive charts showing:
                </p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  <li>• Overall feeling trends</li>
                  <li>• Symptom severity over time</li>
                  <li>• Medication adherence patterns</li>
                  <li>• Lab result comparisons</li>
                  <li>• Goal achievement progress</li>
                </ul>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Goal Progress</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>HbA1c Goal</span>
                        <span className="font-medium">94%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{width: '94%'}}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Weight Loss Goal</span>
                        <span className="font-medium">40%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{width: '40%'}}></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Alerts Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total check-ins</span>
                      <span className="font-medium">12</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Alerts generated</span>
                      <span className="font-medium">2</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Physician reviewed</span>
                      <span className="font-medium">2</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="mt-6 border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="bg-blue-500 text-white p-3 rounded-lg">
              <Activity className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Powered by AI Avatar Technology</h3>
              <p className="text-sm text-muted-foreground">
                This patient portal uses advanced AI to conduct dynamic, context-aware conversations 
                that adapt to each patient's unique situation. The system automatically detects concerning 
                patterns and alerts physicians when intervention may be needed, enabling proactive care 
                management between appointments.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
