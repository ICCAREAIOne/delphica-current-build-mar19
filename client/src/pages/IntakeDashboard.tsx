import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { 
  ArrowLeft, 
  Search, 
  MessageSquare, 
  CheckCircle, 
  Clock, 
  Copy, 
  ExternalLink,
  FileText,
  Calendar
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

export default function IntakeDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "in_progress" | "completed">("all");
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const { data: sessions, isLoading, refetch } = trpc.intake.listSessions.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter
  });

  const generateLink = trpc.intake.generateLink.useMutation({
    onSuccess: (data) => {
      const intakeUrl = `${window.location.origin}/intake?token=${data.sessionToken}`;
      navigator.clipboard.writeText(intakeUrl);
      toast.success("Intake link copied to clipboard!");
    },
    onError: (error) => {
      toast.error(`Failed to generate link: ${error.message}`);
    }
  });

  const handleGenerateLink = (patientName: string, patientEmail: string) => {
    generateLink.mutate({ patientName, patientEmail });
  };

  const handleViewDetails = (session: any) => {
    setSelectedSession(session);
    setShowDetailModal(true);
  };

  const handleCreateEncounter = (session: any) => {
    // Navigate to new encounter with intake session token
    setLocation(`/patients/${session.patientId || 'new'}/encounters/new?intakeSession=${session.sessionToken}`);
  };

  const filteredSessions = sessions?.filter(session => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      session.patientName?.toLowerCase().includes(query) ||
      session.patientEmail?.toLowerCase().includes(query)
    );
  });

  return (
    <DashboardLayout>
      <div className="container max-w-7xl py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Patient Intake Sessions</h1>
            <p className="text-muted-foreground mt-1">
              Manage and review patient intake questionnaires
            </p>
          </div>
          <Button
            onClick={() => {
              const name = prompt("Patient Name:");
              const email = prompt("Patient Email:");
              if (name && email) {
                handleGenerateLink(name, email);
              }
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Generate Intake Link
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-4 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by patient name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="in_progress">In Progress</TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Sessions List */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading sessions...</p>
          </div>
        ) : filteredSessions && filteredSessions.length > 0 ? (
          <div className="grid gap-4">
            {filteredSessions.map((session) => (
              <Card key={session.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{session.patientName}</h3>
                        <Badge variant={session.status === "completed" ? "default" : "secondary"}>
                          {session.status === "completed" ? (
                            <><CheckCircle className="w-3 h-3 mr-1" /> Completed</>
                          ) : (
                            <><Clock className="w-3 h-3 mr-1" /> Active</>
                          )}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{session.patientEmail}</p>
                      
                      {session.collectedData && (
                        <div className="bg-muted/50 rounded-lg p-3 mb-3">
                          <p className="text-sm font-medium mb-1">Chief Complaint:</p>
                          <p className="text-sm">{session.collectedData.chiefComplaint || "Not yet provided"}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(session.createdAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {session.messages?.length || 0} messages
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(session)}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                      {session.status === "completed" && (
                        <Button
                          size="sm"
                          onClick={() => handleCreateEncounter(session)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Create Encounter
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const intakeUrl = `${window.location.origin}/intake?token=${session.sessionToken}`;
                          navigator.clipboard.writeText(intakeUrl);
                          toast.success("Link copied!");
                        }}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Link
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No intake sessions found</p>
              <Button
                onClick={() => {
                  const name = prompt("Patient Name:");
                  const email = prompt("Patient Email:");
                  if (name && email) {
                    handleGenerateLink(name, email);
                  }
                }}
                className="mt-4"
                variant="outline"
              >
                Generate First Intake Link
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Detail Modal */}
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Intake Session Details</DialogTitle>
              <DialogDescription>
                {selectedSession?.patientName} - {selectedSession?.patientEmail}
              </DialogDescription>
            </DialogHeader>

            {selectedSession && (
              <div className="space-y-6">
                {/* Collected Data */}
                {selectedSession.collectedData && (
                  <div>
                    <h3 className="font-semibold mb-3">Collected Information</h3>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                      {selectedSession.collectedData.chiefComplaint && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Chief Complaint</p>
                          <p className="text-sm">{selectedSession.collectedData.chiefComplaint}</p>
                        </div>
                      )}
                      {selectedSession.collectedData.symptoms && selectedSession.collectedData.symptoms.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Symptoms</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {selectedSession.collectedData.symptoms.map((symptom: string, i: number) => (
                              <Badge key={i} variant="secondary">{symptom}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedSession.collectedData.duration && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Duration</p>
                          <p className="text-sm">{selectedSession.collectedData.duration}</p>
                        </div>
                      )}
                      {selectedSession.collectedData.severity && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Severity</p>
                          <p className="text-sm">{selectedSession.collectedData.severity}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Conversation History */}
                <div>
                  <h3 className="font-semibold mb-3">Conversation History</h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {selectedSession.messages && selectedSession.messages.length > 0 ? (
                      selectedSession.messages.map((msg: any, i: number) => (
                        <div
                          key={i}
                          className={`p-3 rounded-lg ${
                            msg.role === "user" 
                              ? "bg-blue-50 ml-8" 
                              : "bg-muted/50 mr-8"
                          }`}
                        >
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            {msg.role === "user" ? "Patient" : "AI Assistant"}
                          </p>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No messages yet
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
