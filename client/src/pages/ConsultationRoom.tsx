import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Users, 
  MessageSquare, 
  Send,
  UserPlus,
  Video,
  FileText,
  Brain,
  Activity,
  Clock,
  CheckCircle2,
  Circle,
  ArrowLeft
} from "lucide-react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

interface Participant {
  id: string;
  name: string;
  specialty: string;
  role: "lead" | "consultant";
  status: "active" | "away" | "offline";
  joinedAt: string;
}

interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  timestamp: string;
  type: "comment" | "recommendation" | "question";
}

interface ConsultationActivity {
  id: string;
  type: "join" | "comment" | "simulation" | "recommendation";
  user: string;
  description: string;
  timestamp: string;
}

export default function ConsultationRoom() {
  const params = useParams();
  const consultationId = params.id || "1";

  const [newComment, setNewComment] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  // Mock data
  const [participants] = useState<Participant[]>([
    {
      id: "1",
      name: "Dr. Sarah Chen",
      specialty: "Cardiology",
      role: "lead",
      status: "active",
      joinedAt: "2026-02-15T09:00:00Z"
    },
    {
      id: "2",
      name: "Dr. Michael Torres",
      specialty: "Endocrinology",
      role: "consultant",
      status: "active",
      joinedAt: "2026-02-15T09:15:00Z"
    },
    {
      id: "3",
      name: "Dr. Emily Watson",
      specialty: "Nephrology",
      role: "consultant",
      status: "away",
      joinedAt: "2026-02-15T09:30:00Z"
    }
  ]);

  const [comments, setComments] = useState<Comment[]>([
    {
      id: "1",
      authorId: "1",
      authorName: "Dr. Sarah Chen",
      content: "Patient presents with complex case of diabetes with cardiac complications. Looking for input on optimal treatment approach.",
      timestamp: "2026-02-15T09:05:00Z",
      type: "comment"
    },
    {
      id: "2",
      authorId: "2",
      authorName: "Dr. Michael Torres",
      content: "HbA1c of 9.2% suggests poor glycemic control. I recommend initiating GLP-1 agonist therapy given the cardiac benefits.",
      timestamp: "2026-02-15T09:20:00Z",
      type: "recommendation"
    },
    {
      id: "3",
      authorId: "3",
      authorName: "Dr. Emily Watson",
      content: "What's the current eGFR? Need to assess kidney function before adjusting medications.",
      timestamp: "2026-02-15T09:35:00Z",
      type: "question"
    }
  ]);

  const [activities] = useState<ConsultationActivity[]>([
    {
      id: "1",
      type: "join",
      user: "Dr. Sarah Chen",
      description: "created the consultation",
      timestamp: "2026-02-15T09:00:00Z"
    },
    {
      id: "2",
      type: "join",
      user: "Dr. Michael Torres",
      description: "joined the consultation",
      timestamp: "2026-02-15T09:15:00Z"
    },
    {
      id: "3",
      type: "simulation",
      user: "Dr. Sarah Chen",
      description: "ran Delphi simulation for treatment options",
      timestamp: "2026-02-15T09:25:00Z"
    },
    {
      id: "4",
      type: "recommendation",
      user: "Dr. Michael Torres",
      description: "added treatment recommendation",
      timestamp: "2026-02-15T09:30:00Z"
    }
  ]);

  const patientCase = {
    id: "P-001",
    name: "John Doe",
    age: 58,
    gender: "Male",
    chiefComplaint: "Poorly controlled diabetes with new onset chest pain",
    diagnoses: ["Type 2 Diabetes Mellitus", "Hypertension", "Hyperlipidemia"],
    currentMedications: ["Metformin 1000mg BID", "Lisinopril 20mg daily", "Atorvastatin 40mg daily"],
    recentLabs: {
      hba1c: "9.2%",
      glucose: "245 mg/dL",
      creatinine: "1.3 mg/dL",
      egfr: "62 mL/min/1.73m²"
    }
  };

  const handleSendComment = () => {
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: `${comments.length + 1}`,
      authorId: "1",
      authorName: "Dr. Sarah Chen",
      content: newComment,
      timestamp: new Date().toISOString(),
      type: "comment"
    };

    setComments([...comments, comment]);
    setNewComment("");
    toast.success("Comment added");
  };

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    toast.success(`Invitation sent to ${inviteEmail}`);
    setInviteEmail("");
  };

  const handleRunSimulation = () => {
    toast.info("Running Delphi simulation with current case data...");
    setTimeout(() => {
      toast.success("Simulation complete - view results in Framework Workflow");
    }, 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "away": return "bg-yellow-500";
      case "offline": return "bg-gray-400";
      default: return "bg-gray-400";
    }
  };

  const getCommentIcon = (type: string) => {
    switch (type) {
      case "recommendation": return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "question": return <Circle className="h-4 w-4 text-blue-600" />;
      default: return <MessageSquare className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto py-6 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                Multi-Provider Consultation
              </h1>
              <p className="text-sm text-muted-foreground">
                Case ID: {consultationId} • {participants.length} participants
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Video className="h-4 w-4 mr-2" />
              Start Video Call
            </Button>
            <Button variant="outline" size="sm" onClick={handleRunSimulation}>
              <Brain className="h-4 w-4 mr-2" />
              Run Simulation
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Patient Case Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Patient Case Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Patient:</span>
                      <p className="font-medium">{patientCase.name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Age/Gender:</span>
                      <p className="font-medium">{patientCase.age}y / {patientCase.gender}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Case ID:</span>
                      <p className="font-medium">{patientCase.id}</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-2">Chief Complaint</h4>
                    <p className="text-sm text-muted-foreground">{patientCase.chiefComplaint}</p>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Current Diagnoses</h4>
                    <div className="flex flex-wrap gap-2">
                      {patientCase.diagnoses.map((dx, i) => (
                        <Badge key={i} variant="outline">{dx}</Badge>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2 text-sm">Current Medications</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {patientCase.currentMedications.map((med, i) => (
                          <li key={i}>• {med}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2 text-sm">Recent Labs</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>HbA1c: <span className="font-medium text-red-600">{patientCase.recentLabs.hba1c}</span></div>
                        <div>Glucose: {patientCase.recentLabs.glucose}</div>
                        <div>Creatinine: {patientCase.recentLabs.creatinine}</div>
                        <div>eGFR: {patientCase.recentLabs.egfr}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Discussion Thread */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Discussion Thread
                </CardTitle>
                <CardDescription>Collaborative case discussion and recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{comment.authorName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{comment.authorName}</span>
                            {getCommentIcon(comment.type)}
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <Separator className="my-4" />

                <div className="flex gap-2">
                  <Textarea
                    placeholder="Add your comment or recommendation..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={2}
                    className="flex-1"
                  />
                  <Button onClick={handleSendComment}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Participants */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Participants ({participants.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar>
                        <AvatarFallback>{participant.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${getStatusColor(participant.status)}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{participant.name}</p>
                      <p className="text-xs text-muted-foreground">{participant.specialty}</p>
                    </div>
                    {participant.role === "lead" && (
                      <Badge variant="secondary" className="text-xs">Lead</Badge>
                    )}
                  </div>
                ))}

                <Separator />

                <div className="flex gap-2">
                  <Input
                    placeholder="Email address"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="text-sm"
                  />
                  <Button size="sm" onClick={handleInvite}>
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Activity Feed */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Activity Feed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {activities.map((activity) => (
                      <div key={activity.id} className="flex gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p>
                            <span className="font-medium">{activity.user}</span>{' '}
                            {activity.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(activity.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
