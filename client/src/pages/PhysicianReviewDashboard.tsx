import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Search,
  Filter,
  ChevronRight,
  User,
  Calendar,
  Loader2
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function PhysicianReviewDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedLab, setSelectedLab] = useState<number | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch pending reviews
  const { data: pendingReviews, isLoading: pendingLoading, refetch: refetchPending } = 
    trpc.physicianReview.getPendingReviews.useQuery({
      physicianId: user?.id
    });

  // Fetch reviewed labs
  const { data: reviewedLabs, isLoading: reviewedLoading, refetch: refetchReviewed } = 
    trpc.physicianReview.getReviewedLabs.useQuery({
      physicianId: user?.id,
      limit: 50
    });

  // Review lab mutation
  const reviewMutation = trpc.physicianReview.reviewLab.useMutation({
    onSuccess: () => {
      refetchPending();
      refetchReviewed();
      setSelectedLab(null);
      setReviewNotes("");
    }
  });

  const handleReview = async (labId: number) => {
    await reviewMutation.mutateAsync({
      labId,
      notes: reviewNotes
    });
  };

  const filteredPending = pendingReviews?.filter(item => {
    if (!searchTerm) return true;
    const patient = item.patient;
    const lab = item.labResult;
    return (
      patient?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient?.mrn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lab?.labName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }) || [];

  const filteredReviewed = reviewedLabs?.filter(item => {
    if (!searchTerm) return true;
    const patient = item.patient;
    const lab = item.labResult;
    return (
      patient?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient?.mrn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lab?.labName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }) || [];

  const renderLabCard = (item: any, isPending: boolean) => {
    const lab = item.labResult;
    const patient = item.patient;
    const isSelected = selectedLab === lab.id;

    return (
      <Card 
        key={lab.id} 
        className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-blue-500' : 'hover:shadow-md'}`}
        onClick={() => setSelectedLab(lab.id)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Patient Info */}
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="font-semibold">
                  {patient?.firstName} {patient?.lastName}
                </span>
                <Badge variant="outline" className="text-xs">
                  MRN: {patient?.mrn}
                </Badge>
              </div>

              {/* Lab Info */}
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="text-sm">{lab.labName || 'Lab Results'}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>Test Date: {new Date(lab.testDate).toLocaleDateString()}</span>
                <span className="mx-2">•</span>
                <span>Uploaded: {new Date(lab.createdAt).toLocaleDateString()}</span>
              </div>

              {/* Test Results Summary */}
              {lab.testResults && (
                <div className="mt-2 text-sm text-gray-600">
                  {Array.isArray(lab.testResults) ? lab.testResults.length : JSON.parse(lab.testResults as any).length} tests found
                </div>
              )}

              {/* Review Info (for reviewed labs) */}
              {!isPending && lab.reviewedAt && (
                <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Reviewed on {new Date(lab.reviewedAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>

          {/* Expanded View */}
          {isSelected && (
            <div className="mt-4 pt-4 border-t space-y-4">
              {/* Test Results */}
              <div>
                <h4 className="font-semibold mb-2">Test Results:</h4>
                <div className="space-y-2">
                  {(Array.isArray(lab.testResults) ? lab.testResults : JSON.parse(lab.testResults as any)).map((test: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <span className="font-medium">{test.testName}</span>
                        {test.normalRange && (
                          <span className="text-xs text-gray-500 ml-2">
                            (Normal: {test.normalRange})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {test.value} {test.unit}
                        </span>
                        {test.flag && test.flag !== 'normal' && (
                          <Badge
                            variant="outline"
                            className={
                              test.flag === 'critical'
                                ? 'text-red-600 border-red-600'
                                : test.flag === 'high'
                                ? 'text-orange-600 border-orange-600'
                                : 'text-blue-600 border-blue-600'
                            }
                          >
                            {test.flag}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Previous Notes (if reviewed) */}
              {!isPending && lab.physicianNotes && (
                <div>
                  <h4 className="font-semibold mb-2">Physician Notes:</h4>
                  <div className="p-3 bg-blue-50 rounded border border-blue-200">
                    <p className="text-sm whitespace-pre-wrap">{lab.physicianNotes}</p>
                  </div>
                </div>
              )}

              {/* Review Form (for pending) */}
              {isPending && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor={`notes-${lab.id}`}>Review Notes</Label>
                    <Textarea
                      id={`notes-${lab.id}`}
                      placeholder="Add your clinical notes, observations, or recommendations..."
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      rows={4}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleReview(lab.id)}
                      disabled={reviewMutation.isPending || !reviewNotes.trim()}
                      className="flex-1"
                    >
                      {reviewMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Approve & Submit Review
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedLab(null);
                        setReviewNotes("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Lab Results Review Dashboard</h1>
        <p className="text-gray-600">
          Review and annotate patient lab results uploaded through the patient portal
        </p>
      </div>

      {/* Search and Filter */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by patient name, MRN, or lab name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Reviews</p>
                <p className="text-3xl font-bold">{filteredPending.length}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Reviewed Today</p>
                <p className="text-3xl font-bold">
                  {reviewedLabs?.filter(item => {
                    if (!item.labResult.reviewedAt) return false;
                    const reviewDate = new Date(item.labResult.reviewedAt);
                    const today = new Date();
                    return reviewDate.toDateString() === today.toDateString();
                  }).length || 0}
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Reviewed</p>
                <p className="text-3xl font-bold">{reviewedLabs?.length || 0}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="pending">
            Pending Reviews ({filteredPending.length})
          </TabsTrigger>
          <TabsTrigger value="reviewed">
            Reviewed ({filteredReviewed.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : filteredPending.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
                <p className="text-gray-600">
                  No pending lab results to review at this time.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredPending.map(item => renderLabCard(item, true))
          )}
        </TabsContent>

        <TabsContent value="reviewed" className="space-y-4">
          {reviewedLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : filteredReviewed.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Reviewed Labs</h3>
                <p className="text-gray-600">
                  Reviewed lab results will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredReviewed.map(item => renderLabCard(item, false))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
